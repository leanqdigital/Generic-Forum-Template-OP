function fetchGraphQL(query, variables = {}) {
  return fetch(HTTP_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Api-Key": API_KEY,
    },
    body: JSON.stringify({ query, variables }),
  }).then((r) => r.json());
}
