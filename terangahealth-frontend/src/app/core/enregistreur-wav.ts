export class EnregistreurWav {
  private flux: MediaStream | null = null;
  private enregistreur: MediaRecorder | null = null;
  private morceaux: Blob[] = [];
  private minuteur: any = null;

  /** Démarre l'enregistrement. surLimite est appelé après dureeMaxSecondes. */
  async demarrer(surLimite: () => void, dureeMaxSecondes = 25): Promise<void> {
    this.flux = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.morceaux = [];
    this.enregistreur = new MediaRecorder(this.flux);
    this.enregistreur.ondataavailable = (e) => {
      if (e.data.size > 0) this.morceaux.push(e.data);
    };
    this.enregistreur.start();
    this.minuteur = setTimeout(surLimite, dureeMaxSecondes * 1000);
  }

  /** Arrête l'enregistrement et retourne un fichier WAV mono 16 kHz. */
  arreter(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const rec = this.enregistreur;
      if (!rec || rec.state === 'inactive') {
        reject(new Error('Aucun enregistrement en cours.'));
        return;
      }
      clearTimeout(this.minuteur);
      rec.onstop = async () => {
        const brut = new Blob(this.morceaux, { type: rec.mimeType || 'audio/webm' });
        this.flux?.getTracks().forEach((t) => t.stop());
        this.flux = null;
        this.enregistreur = null;
        try {
          resolve(await convertirEnWav(brut));
        } catch (e) {
          reject(e);
        }
      };
      rec.stop();
    });
  }

  /** Abandonne l'enregistrement sans rien envoyer. */
  annuler(): void {
    clearTimeout(this.minuteur);
    if (this.enregistreur && this.enregistreur.state !== 'inactive') {
      this.enregistreur.onstop = null;
      this.enregistreur.stop();
    }
    this.flux?.getTracks().forEach((t) => t.stop());
    this.flux = null;
    this.enregistreur = null;
  }
}

async function convertirEnWav(blob: Blob): Promise<Blob> {
  const donnees = await blob.arrayBuffer();
  const contexte = new AudioContext();
  let audio: AudioBuffer;
  try {
    audio = await contexte.decodeAudioData(donnees);
  } finally {
    contexte.close().catch(() => {});
  }
  const frequence = 16000;
  const hors = new OfflineAudioContext(1, Math.max(1, Math.ceil(audio.duration * frequence)), frequence);
  const source = hors.createBufferSource();
  source.buffer = audio;
  source.connect(hors.destination);
  source.start();
  const rendu = await hors.startRendering();
  return encoderWav(rendu.getChannelData(0), frequence);
}

function encoderWav(echantillons: Float32Array, frequence: number): Blob {
  const tampon = new ArrayBuffer(44 + echantillons.length * 2);
  const vue = new DataView(tampon);
  const ecrire = (pos: number, texte: string) => {
    for (let i = 0; i < texte.length; i++) vue.setUint8(pos + i, texte.charCodeAt(i));
  };
  ecrire(0, 'RIFF');
  vue.setUint32(4, 36 + echantillons.length * 2, true);
  ecrire(8, 'WAVE');
  ecrire(12, 'fmt ');
  vue.setUint32(16, 16, true);
  vue.setUint16(20, 1, true);
  vue.setUint16(22, 1, true);
  vue.setUint32(24, frequence, true);
  vue.setUint32(28, frequence * 2, true);
  vue.setUint16(32, 2, true);
  vue.setUint16(34, 16, true);
  ecrire(36, 'data');
  vue.setUint32(40, echantillons.length * 2, true);
  let pos = 44;
  for (let i = 0; i < echantillons.length; i++) {
    const s = Math.max(-1, Math.min(1, echantillons[i]));
    vue.setInt16(pos, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    pos += 2;
  }
  return new Blob([vue], { type: 'audio/wav' });
}
