package com.usv.app.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final JdbcTemplate jdbcTemplate;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = authHeader.substring(7).trim();
        try {
            Claims claims = jwtService.parseClaims(token);
            String email = claims.getSubject();

            if (email != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                        "SELECT role, is_active FROM users WHERE email = ?",
                        email
                );

                if (!rows.isEmpty() && Boolean.TRUE.equals(rows.getFirst().get("is_active"))) {
                    String role = rows.getFirst().get("role").toString().toUpperCase();
                    var authority = new SimpleGrantedAuthority("ROLE_" + role);

                    var authentication = new UsernamePasswordAuthenticationToken(
                            email,
                            null,
                            List.of(authority)
                    );
                    authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                }
            }
        } catch (JwtException ignored) {
            // Token invalid sau expirat: contextul rămâne neautentificat,
            // iar rutele protejate vor răspunde automat cu 401 Unauthorized.
        }

        filterChain.doFilter(request, response);
    }
}