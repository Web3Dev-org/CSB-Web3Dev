package com.usv.app.config;

import com.usv.app.security.JwtAuthenticationFilter;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new Argon2PasswordEncoder(
                16,       // Salt length
                32,       // Hash length
                1,        // Parallelism
                19456,    // Memory (19 MiB)
                2         // Iterations
        );
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(Customizer.withDefaults())
            .sessionManagement(session ->
                    session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(ex -> ex
                    .authenticationEntryPoint((request, response, authException) ->
                            writeProblemJson(
                                    response,
                                    HttpServletResponse.SC_UNAUTHORIZED,
                                    "https://api.sport.usv.ro/problems/unauthorized",
                                    "Unauthorized",
                                    "Token JWT lipsă, expirat sau invalid.",
                                    request.getRequestURI()
                            ))
                    .accessDeniedHandler((request, response, accessDeniedException) ->
                            writeProblemJson(
                                    response,
                                    HttpServletResponse.SC_FORBIDDEN,
                                    "https://api.sport.usv.ro/problems/forbidden",
                                    "Forbidden",
                                    "Nu aveți permisiunile necesare pentru această resursă.",
                                    request.getRequestURI()
                            ))
            )
            .authorizeHttpRequests(auth -> auth
                    .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                    .requestMatchers(
                            HttpMethod.POST,
                            "/auth/login",
                            "/auth/register",
                            "/auth/forgot-password",
                            "/auth/reset-password"
                    ).permitAll()
                    .requestMatchers(
                            HttpMethod.GET,
                            "/app/settings",
                            "/app/statuses",
                            "/app/equipment",
                            "/app/terms/current",
                            "/facilities",
                            "/facilities/*/availability"
                    ).permitAll()
                    .requestMatchers("/admin/**").hasRole("ADMIN")
                    .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    private void writeProblemJson(
            HttpServletResponse response,
            int status,
            String type,
            String title,
            String detail,
            String instance) throws IOException {
        response.setStatus(status);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);

        String json = """
                {
                  "type": "%s",
                  "title": "%s",
                  "status": %d,
                  "detail": "%s",
                  "instance": "https://api.sport.usv.ro%s"
                }
                """.formatted(type, title, status, detail, instance);
        response.getWriter().write(json);
    }
}