export function filterHorses(horses, query) {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return horses;
  return horses.filter((horse) => `${horse.name} ${horse.horseId || ''}`.toLocaleLowerCase().includes(normalized));
}
