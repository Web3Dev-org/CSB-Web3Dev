package com.usv.app.service;

import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class BookingWindowTest {

    private static final int HORIZON_DAYS = 7;
    /** Miercuri, 25 nov. 2026, ora 20:00 (Europe/Bucharest). */
    private static final LocalDateTime NOW = LocalDateTime.of(2026, 11, 25, 20, 0);

    @Test
    void rejectsLaterSlotOnTheCurrentDay() {
        assertThatThrownBy(() -> BookingWindow.validate(NOW.withHour(21), NOW, HORIZON_DAYS))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("ziua următoare");
    }

    @Test
    void rejectsPastStart() {
        assertThatThrownBy(() -> BookingWindow.validate(NOW.minusDays(1), NOW, HORIZON_DAYS))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("ziua următoare");
    }

    @Test
    void acceptsEarliestSlotTomorrow() {
        assertThatCode(() -> BookingWindow.validate(LocalDateTime.of(2026, 11, 26, 0, 0), NOW, HORIZON_DAYS))
                .doesNotThrowAnyException();
    }

    @Test
    void acceptsLatestSlotOnLastCalendarDayOfHorizon() {
        // 2 dec. este a 7-a zi după azi; 23:00 e după ora curentă, dar ziua e în orizont.
        assertThatCode(() -> BookingWindow.validate(LocalDateTime.of(2026, 12, 2, 23, 0), NOW, HORIZON_DAYS))
                .doesNotThrowAnyException();
    }

    @Test
    void rejectsFirstSlotAfterHorizon() {
        assertThatThrownBy(() -> BookingWindow.validate(LocalDateTime.of(2026, 12, 3, 0, 0), NOW, HORIZON_DAYS))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("cel mult 7 zile");
    }
}
