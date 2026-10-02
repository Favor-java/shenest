package com.shenest;

import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.boot.web.servlet.error.ErrorController;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.RequestMapping;

import java.io.IOException;
import java.util.Map;

/** Return an HTML error page for visitors, or JSON for an API request. */
@Controller
public class HtmlErrors implements ErrorController {
    private final BrowserSession browserSession;
    private final ObjectMapper jsonMapper;

    public HtmlErrors(BrowserSession browserSession, ObjectMapper jsonMapper) {
        this.browserSession = browserSession;
        this.jsonMapper = jsonMapper;
    }

    @RequestMapping("/error")
    public String showError(HttpServletRequest request, HttpServletResponse response, Model model)
            throws IOException {
        // The servlet container adds these attributes when forwarding an error.
        Object statusAttribute = request.getAttribute("jakarta.servlet.error.status_code");
        int status = 500;
        if (statusAttribute instanceof Integer) {
            status = (Integer) statusAttribute;
        }

        Object pathAttribute = request.getAttribute("jakarta.servlet.error.request_uri");
        String path = "";
        if (pathAttribute != null) {
            path = pathAttribute.toString();
        }

        // A missing image or stylesheet should not create a new login session.
        if (isAssetPath(path)) {
            response.setStatus(status);
            response.setContentType("text/plain");
            response.getWriter().write("Not found.");
            return null; // The response is already written; no template is needed.
        }

        if (path.startsWith("/api/") || path.startsWith("/ui/")) {
            String message = "Something went wrong.";
            if (status == 404) {
                message = "Not found.";
            }

            response.setStatus(status);
            response.setContentType("application/json");
            jsonMapper.writeValue(response.getWriter(), Map.of("message", message));
            return null;
        }

        Map<String, Object> currentUser = browserSession.getCurrentUser(request);
        boolean isLandlord = false;
        boolean isAdmin = false;
        if (currentUser != null) {
            isLandlord = "LANDLORD".equals(currentUser.get("role"));
            isAdmin = "ADMIN".equals(currentUser.get("role"));
        }

        model.addAttribute("currentUser", currentUser);
        model.addAttribute("loggedIn", currentUser != null);
        model.addAttribute("isLandlord", isLandlord);
        model.addAttribute("isAdmin", isAdmin);
        model.addAttribute("csrf", browserSession.getCsrfToken(request));
        model.addAttribute("serverError", status != 404);
        return "not-found";
    }

    private boolean isAssetPath(String path) {
        return path.startsWith("/uploads/")
                || path.startsWith("/css/")
                || path.startsWith("/js/")
                || path.equals("/favicon.ico");
    }
}
