export function dateSeule(valeur: string | null | undefined): string {
  if (!valeur) return '';
  return String(valeur).substring(0, 10);
}

export function formatDateLong(dateStr: string): string {
  const normalized = dateSeule(dateStr) || dateStr;
  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const label = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date);

  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function heureCourte(heure: string): string {
  if (!heure) return '';
  return heure.substring(0, 5);
}
