export function notFound(_req, res) {
  return res.status(404).json({ message: 'API route not found.' });
}

export function errorHandler(error, _req, res, _next) {
  const status = error.status || (['ValidationError', 'CastError'].includes(error.name) ? 400 : 500);
  if (status >= 500) console.error(error);
  return res.status(status).json({ message: status === 500 ? 'Unexpected server error. Check server logs.' : error.message });
}
