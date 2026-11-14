export function isStallOccupied(stallId, assignments, date) {
  return assignments.some((assignment) => assignment.stallId === stallId
    && assignment.startDate <= date
    && (!assignment.endDate || assignment.endDate >= date));
}

export function countAvailableStalls(stalls, assignments, date) {
  return stalls.filter((stall) => stall.status === 'Available'
    && !isStallOccupied(stall._id, assignments, date)).length;
}
