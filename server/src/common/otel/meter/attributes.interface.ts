export interface HttpAttributes {
  method: string; // The HTTP method, e.g., GET, POST, etc.
  route: string; // The route pattern, e.g., /users/:id
  handler: string; // The actual handler function or class name, e.g., UserController.getUser
  statusCode?: number; // The HTTP status code of the response, e.g., 200, 404, etc.
}

export interface RpcAttributes {
  service: string; // The name of the RPC service, e.g., PostService
  method: string; // The name of the RPC method, e.g., CreatePost
  statusCode?: number; // The HTTP status code of the response, e.g., 200, 404, etc.
}
