package com.usv.app;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.util.TimeZone;

@SpringBootApplication
public class AppApplication {

	/**
	 * Serviciile lucrează cu ora locală a României (LocalDateTime + Timestamp.valueOf), iar
	 * conexiunea JDBC are serverTimezone=Europe/Bucharest. Dacă JVM-ul rulează în alt fus
	 * (ex. UTC în container), driverul convertește ora și o decalează (+2/+3h).
	 */
	static final String APP_TIME_ZONE = "Europe/Bucharest";

	public static void main(String[] args) {
		TimeZone.setDefault(TimeZone.getTimeZone(APP_TIME_ZONE));
		SpringApplication.run(AppApplication.class, args);
	}

}
