<?php

namespace App\Http\Controllers;

use App\Models\Service;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class ChatbotController extends Controller
{
    /**
     * Analyse le message du patient et recommande un service, sur la base
     * du dictionnaire de mots-clés config/orientation.php (aucune nouvelle table,
     * même principe que RendezVous::detecterUrgence()).
     * POST /api/chatbot/orienter
     */
    public function orienter(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'message' => 'required|string|min:3|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Données invalides.',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $texte = Str::lower($request->message);
        $dictionnaire = config('orientation');

        $servicesTrouves = [];

        foreach ($dictionnaire as $nomService => $motsCles) {
            foreach ($motsCles as $motCle) {
                if (Str::contains($texte, Str::lower($motCle))) {
                    $servicesTrouves[$nomService] = ($servicesTrouves[$nomService] ?? 0) + 1;
                    break; // un seul point par service, même si plusieurs mots-clés matchent
                }
            }
        }

        if (empty($servicesTrouves)) {
            return response()->json([
                'reponse' => "Je n'ai pas identifié de spécialité précise à partir de votre message. Pouvez-vous décrire vos symptômes plus en détail, ou consulter directement notre page \"Médecine générale\" ?",
                'services' => [],
            ]);
        }

        // trie par nombre de mots-clés correspondants, le plus pertinent en premier
        arsort($servicesTrouves);
        $nomsServicesTries = array_keys($servicesTrouves);

        $services = Service::whereIn('nom', $nomsServicesTries)
            ->with(['medecins' => function ($q) {
                $q->where('statut', 'actif');
            }])
            ->get()
            ->sortBy(fn ($s) => array_search($s->nom, $nomsServicesTries))
            ->values();

        $premierService = $services->first();

        $reponse = "D'après ce que vous décrivez, je vous recommande de consulter en **{$premierService->nom}**.";

        if ($services->count() > 1) {
            $autres = $services->slice(1)->pluck('nom')->implode(', ');
            $reponse .= " Vous pourriez aussi envisager : {$autres}.";
        }

        return response()->json([
            'reponse'  => $reponse,
            'services' => $services->map(fn ($s) => [
                'id'               => $s->id,
                'nom'              => $s->nom,
                'description'      => $s->description,
                'nombre_medecins'  => $s->medecins->count(),
                'premier_medecin_id' => $s->medecins->first()?->id,
            ]),
        ]);
    }
}