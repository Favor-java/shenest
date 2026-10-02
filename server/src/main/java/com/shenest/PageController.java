package com.shenest;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

/** HTTP routes delegate processing to the Spring service. */
@Controller
public class PageController {
    private final PageService service;

    public PageController(PageService service) {
        this.service = service;
    }

    // Spring runs this before every page method. These values are shared by the navbar.
    @ModelAttribute
    public void addSharedPageData(Model model, HttpServletRequest request) {
        service.addSharedPageData(model, request);
    }

    @GetMapping("/")
    public String showHomePage(Model model, HttpServletRequest request) {
        return service.showHomePage(model, request);
    }

    @GetMapping("/properties")
    public String showPropertiesPage(
            @RequestParam(defaultValue = "") String search,
            @RequestParam(defaultValue = "") String type,
            Model model,
            HttpServletRequest request) {
        return service.showPropertiesPage(search, type, model, request);
    }

    @GetMapping("/properties/new")
    public String showCreatePropertyPage(Model model) {
        return service.showCreatePropertyPage(model);
    }

    @GetMapping("/properties/{id}")
    public String showPropertyDetails(
            @PathVariable long id,
            Model model,
            HttpServletRequest request,
            HttpServletResponse response) {
        return service.showPropertyDetails(id, model, request, response);
    }

    @GetMapping("/properties/{id}/edit")
    public String showEditPropertyDetails(
            @PathVariable long id, Model model, HttpServletRequest request) {
        return service.showEditPropertyDetails(id, model, request);
    }

    @GetMapping("/favorites")
    public String showFavoritesPage(Model model, HttpServletRequest request) {
        return service.showFavoritesPage(model, request);
    }

    @GetMapping("/roommates")
    public String showRoommatesPage(@RequestParam(defaultValue = "") String location, Model model) {
        return service.showRoommatesPage(location, model);
    }

    @GetMapping("/messages/{userId}")
    public String showMessagesPage(
            @PathVariable long userId, Model model, HttpServletRequest request) {
        return service.showMessagesPage(userId, model, request);
    }

    @GetMapping("/landlord")
    public String showLandlordPage(Model model, HttpServletRequest request) {
        return service.showLandlordPage(model, request);
    }

    @GetMapping("/admin")
    public String showAdminPage(Model model, HttpServletRequest request) {
        return service.showAdminPage(model, request);
    }

    @GetMapping("/account")
    public String showAccountPage(Model model, HttpServletRequest request) {
        return service.showAccountPage(model, request);
    }

    @GetMapping({"/login", "/register"})
    public String showLoginOrRegistrationPage(Model model, HttpServletRequest request) {
        return service.showLoginOrRegistrationPage(model, request);
    }

    @GetMapping("/report")
    public String showReportPage(@RequestParam String type, @RequestParam long id,
            Model model, HttpServletRequest request) {
        return service.showReportPage(type, id, model, request);
    }

    @GetMapping({"/privacy", "/terms"})
    public String showPolicyPage(Model model, HttpServletRequest request) {
        return service.showPolicyPage(model, request);
    }
}
