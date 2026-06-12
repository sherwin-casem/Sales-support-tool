/** Session cookies are sent automatically when credentials: "include" is set. */
export function getClientFetchInit(init: RequestInit = {}): RequestInit {
  return {
    ...init,
    credentials: "include",
    headers: {
      ...init.headers,
    },
  };
}
