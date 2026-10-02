package com.shenest;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.stereotype.Service;

import static org.assertj.core.api.Assertions.assertThat;

/** Keeps controller dependencies on services as new endpoints are added. */
class ControllerArchitectureTest {
    @ParameterizedTest
    @ValueSource(classes = {AuthController.class, PropertyController.class, SocialController.class,
            SafetyController.class, UploadController.class, UiAuthController.class, PageController.class})
    void controllersDependOnlyOnSpringServices(Class<?> controller) {
        assertThat(controller.getDeclaredFields()).isNotEmpty();
        for (var field : controller.getDeclaredFields()) {
            assertThat(field.getType().isAnnotationPresent(Service.class))
                    .as("%s.%s must delegate to a Spring service", controller.getSimpleName(), field.getName())
                    .isTrue();
        }
    }
}
