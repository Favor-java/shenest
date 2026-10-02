package com.shenest;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

/**
 * A small helper for running SQL.
 *
 * <p>A Map represents one database row: the keys are column names such as "id" or "title". A
 * List<Map<String, Object>> represents several rows.
 *
 * <p>The question marks in SQL are placeholders. JdbcTemplate safely fills them with the values
 * passed after the SQL string.
 */
@Repository
public class Database {
    private final JdbcTemplate jdbcTemplate;

    // Spring supplies the configured database connection through this constructor.
    public Database(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<Map<String, Object>> findAll(String sql, Object... values) {
        return jdbcTemplate.queryForList(sql, values);
    }

    public Map<String, Object> findOne(String sql, Object... values) {
        List<Map<String, Object>> rows = findAll(sql, values);
        if (rows.isEmpty()) {
            return null;
        }
        return rows.get(0);
    }

    // Use this for UPDATE, DELETE, or an INSERT when the new ID is not needed.
    public int update(String sql, Object... values) {
        return jdbcTemplate.update(sql, values);
    }

    // Both statements must use the same connection so we get this insert's ID.
    @Transactional
    public long insert(String sql, Object... values) {
        jdbcTemplate.update(sql, values);
        Long newId = jdbcTemplate.queryForObject("SELECT last_insert_rowid()", Long.class);
        return newId;
    }
}
