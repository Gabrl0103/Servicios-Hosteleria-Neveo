package com.heladeria.tpv;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.util.TimeZone;

@SpringBootApplication
@EnableScheduling
public class HeladeriaTpvApplication {

    public static final String ZONE_ID = "America/Bogota";

    public static void main(String[] args) {
        // Zona horaria fija: todas las fechas (LocalDateTime.now(), limites de dia,
        // agrupacion por hora) se interpretan en hora de Colombia, sin depender
        // de la configuracion del PC.
        TimeZone.setDefault(TimeZone.getTimeZone(ZONE_ID));
        SpringApplication.run(HeladeriaTpvApplication.class, args);
    }
}
