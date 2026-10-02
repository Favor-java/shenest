package com.shenest;

/** The small amount of user information needed to check permissions. */
public class AuthenticatedUser {
    private final long id;
    private final String role;

    public AuthenticatedUser(long id, String role) {
        this.id = id;
        this.role = role;
    }

    public long getId() {
        return id;
    }

    public String getRole() {
        return role;
    }
}
