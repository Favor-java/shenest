package com.shenest;

import org.springframework.stereotype.Service;

import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Set;

/** Private reports and personal blocks. Only administrators can read report evidence. */
@Service
public class SafetyService {
    private static final Set<String> REASONS = Set.of(
            "HARASSMENT", "SCAM", "UNSAFE", "MISLEADING", "OTHER");
    private final Database database;
    private final AuthService authentication;

    public SafetyService(Database database, AuthService authentication) {
        this.database = database;
        this.authentication = authentication;
    }

    private Map<String, Object> requireOtherUser(long userId, long currentUserId) {
        if (userId == currentUserId) {
            throw new ApiException(400, "Choose another member.");
        }
        Map<String, Object> user = database.findOne("SELECT id, name FROM users WHERE id = ?", userId);
        if (user == null) throw new ApiException(404, "Member not found.");
        return user;
    }

    public List<Map<String, Object>> blocks(AuthenticatedUser currentUser) {
        AuthenticatedUser user = currentUser;
        return database.findAll("""
                SELECT users.id, users.name, user_blocks.created_at
                FROM user_blocks JOIN users ON users.id = user_blocks.blocked_id
                WHERE blocker_id = ? ORDER BY user_blocks.created_at DESC, users.id DESC
                """, user.getId());
    }

    public Map<String, Boolean> block(long userId, AuthenticatedUser currentUser) {
        AuthenticatedUser current = currentUser;
        requireOtherUser(userId, current.getId());
        database.update("INSERT OR IGNORE INTO user_blocks (blocker_id, blocked_id) VALUES (?, ?)",
                current.getId(), userId);
        return Map.of("blocked", true);
    }

    public Map<String, Boolean> unblock(long userId, AuthenticatedUser currentUser) {
        AuthenticatedUser current = currentUser;
        requireOtherUser(userId, current.getId());
        database.update("DELETE FROM user_blocks WHERE blocker_id = ? AND blocked_id = ?",
                current.getId(), userId);
        return Map.of("blocked", false);
    }

    /** A message may only be reported by its recipient; this never exposes other chats. */
    public Map<String, Object> reportTarget(String type, long id, long reporterId) {
        Map<String, Object> target;
        switch (type) {
            case "USER" -> {
                target = requireOtherUser(id, reporterId);
                String context = "Member: " + target.get("name");
                Map<String, Object> profile = database.findOne(
                        "SELECT bio, location, lifestyle FROM roommate_profiles WHERE user_id = ?", id);
                if (profile != null) {
                    context += "\nProfile: " + profile.get("bio") + "\nLocation: " + profile.get("location")
                            + "\nLifestyle: " + profile.get("lifestyle");
                }
                return Map.of("name", target.get("name"), "subjectId", id,
                        "context", context);
            }
            case "PROPERTY" -> {
                target = database.findOne("SELECT id, title, description, location, owner_id FROM properties WHERE id = ?", id);
                if (target == null) throw new ApiException(404, "Property not found.");
                long ownerId = ((Number) target.get("owner_id")).longValue();
                requireOtherUser(ownerId, reporterId);
                return Map.of("name", target.get("title"), "subjectId", ownerId,
                        "context", target.get("title") + "\n" + target.get("location") + "\n" + target.get("description"));
            }
            case "MESSAGE" -> {
                target = database.findOne("SELECT text, sender_id FROM messages WHERE id = ? AND receiver_id = ?", id, reporterId);
                if (target == null) throw new ApiException(404, "Message not found.");
                return Map.of("name", "Received message", "subjectId", target.get("sender_id"),
                        "context", target.get("text"));
            }
            default -> throw new ApiException(400, "Invalid report target.");
        }
    }

    @Transactional
    public Map<String, Object> report(Map<String, Object> body, AuthenticatedUser currentUser) {
        AuthenticatedUser user = currentUser;
        String type = Input.requireText(body, "targetType");
        long targetId = Input.requireWholeNumber(body, "targetId");
        Map<String, Object> target = reportTarget(type, targetId, user.getId());
        String reason = Input.requireText(body, "reason");
        if (!REASONS.contains(reason)) throw new ApiException(400, "Choose a valid reason.");
        String details = Input.requireText(body, "details");
        if (details.length() > 2000) throw new ApiException(400, "Use no more than 2,000 characters.");
        Map<String, Object> existing = database.findOne("""
                SELECT id FROM safety_reports
                WHERE reporter_id = ? AND target_type = ? AND target_id = ? AND status = 'OPEN'
                """, user.getId(), type, targetId);
        if (existing != null) throw new ApiException(409, "You already have an open report for this item.");
        long id = database.insert("""
                INSERT INTO safety_reports (reporter_id, target_type, target_id, subject_user_id, reason, details, context)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """, user.getId(), type, targetId, target.get("subjectId"), reason, details, target.get("context"));
        return Map.of("id", id, "status", "OPEN");
    }

    public List<Map<String, Object>> myReports(AuthenticatedUser currentUser) {
        AuthenticatedUser user = currentUser;
        return database.findAll("""
                SELECT id, target_type, target_id, reason, status, created_at FROM safety_reports
                WHERE reporter_id = ? ORDER BY id DESC
                """, user.getId());
    }

    public List<Map<String, Object>> adminReports(AuthenticatedUser currentUser) {
        authentication.requireRole(currentUser, "ADMIN", "Admin access required.");
        return database.findAll("""
                SELECT safety_reports.*, reporter.name AS reporter_name, subject.name AS subject_name
                FROM safety_reports
                JOIN users reporter ON reporter.id = reporter_id
                JOIN users subject ON subject.id = subject_user_id
                ORDER BY CASE WHEN status = 'OPEN' THEN 0 ELSE 1 END, safety_reports.id DESC
                """);
    }

    public Map<String, Object> review(long id, Map<String, Object> body,
            AuthenticatedUser currentUser) {
        AuthenticatedUser admin = authentication.requireRole(currentUser, "ADMIN", "Admin access required.");
        String status = Input.requireText(body, "status");
        if (!Set.of("REVIEWED", "DISMISSED").contains(status)) {
            throw new ApiException(400, "Choose reviewed or dismissed.");
        }
        String note = Input.getText(body, "note").trim();
        if (note.isEmpty() || note.length() > 2000) {
            throw new ApiException(400, "Add a review note of up to 2,000 characters.");
        }
        int changed = database.update("""
                UPDATE safety_reports SET status = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, review_note = ?
                WHERE id = ? AND status = 'OPEN'
                """, status, admin.getId(), note, id);
        if (changed == 0) {
            if (database.findOne("SELECT id FROM safety_reports WHERE id = ?", id) == null) {
                throw new ApiException(404, "Report not found.");
            }
            throw new ApiException(409, "This report has already been reviewed.");
        }
        return Map.of("id", id, "status", status);
    }

    public BlockState getBlockState(long currentUserId, long otherUserId) {
        boolean blockedByMe = database.findOne(
                "SELECT 1 FROM user_blocks WHERE blocker_id = ? AND blocked_id = ?",
                currentUserId, otherUserId) != null;
        boolean contactBlocked = blockedByMe || database.findOne(
                "SELECT 1 FROM user_blocks WHERE blocker_id = ? AND blocked_id = ?",
                otherUserId, currentUserId) != null;
        return new BlockState(blockedByMe, contactBlocked);
    }

    public void requireContactAllowed(long firstUserId, long secondUserId) {
        if (getBlockState(firstUserId, secondUserId).contactBlocked()) {
            throw new ApiException(403, "Contact is unavailable between these accounts.");
        }
    }

    public record BlockState(boolean blockedByMe, boolean contactBlocked) {}
}
