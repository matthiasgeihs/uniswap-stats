function parseUrlParams() {
  const queryString = window.location.search
  return new URLSearchParams(queryString)
}

export function getURLParamPositionId() {
  return parseUrlParams().get('id')
}
