package com.shenest;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.io.IOException;
import java.util.Map;

/** Binds ordinary HTML form submissions and delegates their processing to Java. */
@Controller
@RequestMapping("/ui/forms")
public class FormController {
    private final FormService service;

    public FormController(FormService service) {
        this.service = service;
    }

    @PostMapping("/{action}")
    public String submit(@PathVariable String action,
            @RequestParam Map<String, Object> fields,
            @RequestParam(required = false) MultipartFile image,
            HttpServletRequest request, RedirectAttributes redirect) throws IOException {
        return service.submit(action, fields, image, request, redirect);
    }
}
