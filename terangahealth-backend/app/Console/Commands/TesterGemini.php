<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

class TesterGemini extends Command
{
    protected $signature = 'gemini:tester {modele?}';

    protected $description = 'Teste un ou plusieurs modèles Gemini et affiche le statut de chacun';

    public function handle(): int
    {
        $cle = (string) config('services.gemini.api_key');

        if ($cle === '') {
            $this->error('GEMINI_API_KEY est vide dans la configuration.');
            return self::FAILURE;
        }

        $modeles = $this->argument('modele')
            ? [$this->argument('modele')]
            : [
                'gemini-flash-latest',
                'gemini-3.8-flash',
                'gemini-3-flash-preview',
                'gemini-3.1-flash-lite',
                'gemini-3.1-flash-lite-preview',
                'gemini-2.5-flash-lite',
            ];

        $base = 'https://generativelanguage.googleapis.com/v1beta/models/';
        $corps = ['contents' => [['parts' => [['text' => 'Reponds seulement : ok']]]]];

        foreach ($modeles as $modele) {
            try {
                $r = Http::timeout(30)
                    ->withHeaders(['x-goog-api-key' => $cle])
                    ->post($base . $modele . ':generateContent', $corps);

                if ($r->successful()) {
                    $texte = $r->json('candidates.0.content.parts.0.text') ?? '(pas de texte)';
                    $this->info($modele . ' : HTTP 200 -> ' . trim($texte));
                } else {
                    $message = $r->json('error.message') ?? $r->body();
                    $this->line($modele . ' : HTTP ' . $r->status() . ' ' . str_replace($cle, '***', substr($message, 0, 110)));
                }
            } catch (\Exception $e) {
                $this->line($modele . ' : exception ' . str_replace($cle, '***', substr($e->getMessage(), 0, 110)));
            }
        }

        return self::SUCCESS;
    }
}