export type JwtPayload = {
  sub: string; // storing userId as a string
  email: string;
};

// safe user object we attach to the request object. without password.
export type AuthenticatedUser = {
  id: string;
  email: string;
  username: string;
  createdAt: Date;
  updatedAt: Date;
};
