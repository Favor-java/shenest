/*
 * Java renders the HTML. This script handles actions that should not reload a page.
 * The data-* attributes in the templates connect buttons and forms to this file.
 * The wrapper keeps these variables private instead of adding them to window.
 */
(() => {
  const csrf = document.querySelector('meta[name="csrf-token"]').content;
  const signedIn =
    document.querySelector('meta[name="signed-in"]').content === "true";
  const timers = new WeakMap();
  const activeSearches = new Map();
  let renderedPath = location.pathname + location.search;

  // Ordinary requests send JSON. Image uploads send FormData instead.
  // The CSRF token proves that a write came from our own website session.
  async function api(path, { method = "GET", body } = {}) {
    let requestUrl = `/api${path}`;
    if (path.startsWith("/ui/")) {
      requestUrl = path;
    }

    const headers = { "X-CSRF-Token": csrf };
    let requestBody;
    if (body instanceof FormData) {
      requestBody = body;
    } else if (body) {
      headers["Content-Type"] = "application/json";
      requestBody = JSON.stringify(body);
    }

    const response = await fetch(requestUrl, {
      method,
      credentials: "same-origin",
      headers,
      body: requestBody,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Something went wrong.");
    return data;
  }

  // Use textContent so messages are text, never executable HTML.
  function notice(root, text, classes = "form-message") {
    let element = root.querySelector("[data-notice]");
    if (!element) {
      element = document.createElement("p");
      element.dataset.notice = "";
      let submit = null;
      if (root.matches("form")) {
        submit = root.querySelector("button");
      }
      if (submit) submit.before(element);
      else root.append(element);
    }
    element.className = classes;
    element.setAttribute("role", "status");
    element.setAttribute("aria-live", "polite");
    element.textContent = text;
    return element;
  }

  function cardNotice(card, text) {
    const root = card.querySelector(".property-image-wrap");
    const element = notice(root, text, "card-notice");
    clearTimeout(timers.get(card));
    timers.set(
      card,
      setTimeout(() => element.remove(), 2500),
    );
  }

  // Fetch a Java-rendered page and read it as a separate HTML document.
  async function html(url, signal) {
    const response = await fetch(url, { credentials: "same-origin", signal });
    if (!response.ok)
      throw new Error("Could not load this page. Please try again.");
    return new DOMParser().parseFromString(await response.text(), "text/html");
  }
  // Replace just one section, keeping the rest of the current page in place.
  async function refresh(selector, url = location.href) {
    const page = await html(url);
    const next = page.querySelector(selector);
    if (!next) throw new Error("Please reload the page and try again.");
    document.querySelector(selector).replaceWith(next);
  }

  // Listen on document so buttons in newly loaded search results also work.
  document.addEventListener("click", (event) => {
    const thumbnail = event.target.closest("[data-gallery-src]");
    if (!thumbnail) {
      return;
    }
    document.querySelector("[data-gallery-main]").src =
      thumbnail.dataset.gallerySrc;
    for (const button of document.querySelectorAll("[data-gallery-src]")) {
      const selected = button === thumbnail;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    }
  });

  document.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-block-user]");
    if (!button || button.disabled) return;
    const blocked = button.dataset.blocked === "true";
    if (!blocked && !window.confirm("Block this member? New messages and booking requests will stop in both directions. Existing conversations and bookings remain available.")) return;
    button.disabled = true;
    try {
      await api(`/blocks/${button.dataset.blockUser}`, { method: blocked ? "DELETE" : "PUT" });
      await refresh("main");
      const message = notice(document.querySelector("main"), blocked ? "Member unblocked. Contact remains unavailable if they have also blocked you." : "Member blocked. New messages and booking requests are stopped.");
      message.tabIndex = -1;
      message.focus();
    } catch (error) {
      notice(button.closest("main"), error.message);
    } finally {
      button.disabled = false;
    }
  });

  document.addEventListener("click", async (event) => {
    const button = event.target.closest(
      "[data-favorite],[data-details-favorite],[data-logout],[data-booking-status],[data-verify]",
    );
    if (!button || button.disabled) return;
    if (button.hasAttribute("data-favorite") && !signedIn) {
      cardNotice(button.closest(".property-card"), "Log in to save homes.");
      return;
    }
    button.disabled = true;
    try {
      if (button.hasAttribute("data-logout")) {
        await api("/ui/logout", { method: "POST" });
        localStorage.removeItem("shenest_token");
        localStorage.removeItem("shenest_user");
        location.assign("/");
      } else if (button.hasAttribute("data-favorite")) {
        const result = await api(`/favorites/${button.dataset.favorite}`, {
          method: "POST",
        });
        const card = button.closest(".property-card");
        button.classList.toggle("saved", result.saved);
        button.setAttribute("aria-pressed", String(result.saved));
        button.setAttribute(
          "aria-label",
          result.saved
            ? `Remove ${card.querySelector("h3").textContent} from favorites`
            : `Save ${card.querySelector("h3").textContent}`,
        );
        button
          .querySelector("svg")
          .setAttribute("fill", result.saved ? "currentColor" : "none");
        cardNotice(
          card,
          result.saved ? "Saved to favorites." : "Removed from favorites.",
        );
      } else if (button.hasAttribute("data-details-favorite")) {
        const result = await api(
          `/favorites/${button.dataset.detailsFavorite}`,
          { method: "POST" },
        );
        notice(
          document.querySelector(".booking-card"),
          result.saved ? "Saved to your favorites." : "Removed from favorites.",
        );
      } else {
        let message;
        if (button.hasAttribute("data-verify")) {
          await api(`/properties/${button.dataset.verify}/verify`, {
            method: "PATCH",
          });
          message = "Property verified.";
        } else {
          await api(`/bookings/${button.dataset.bookingStatus}/status`, {
            method: "PATCH",
            body: { status: button.dataset.status },
          });
          message = `Booking ${button.dataset.status.toLowerCase()}.`;
        }
        await refresh("main");
        const element = notice(
          document.querySelector("main"),
          message,
          "form-message success-message",
        );
        document
          .querySelector(".dashboard-heading,.page-heading")
          .after(element);
      }
    } catch (error) {
      if (button.hasAttribute("data-favorite"))
        cardNotice(button.closest(".property-card"), error.message);
      else
        notice(
          button.closest(".booking-card") || document.querySelector("main"),
          error.message,
        );
    } finally {
      button.disabled = false;
    }
  });

  // Each form has its own small handler. The listener below manages shared
  // tasks: reading fields, disabling the button, and displaying errors.
  async function submitLoginOrRegistration(form, fields) {
    const result = await api(`/ui/${form.dataset.auth}`, {
      method: "POST",
      body: fields,
    });
    if (result.user.role === "LANDLORD") {
      location.assign("/landlord");
    } else if (result.user.role === "ADMIN") {
      location.assign("/admin");
    } else {
      location.assign("/properties");
    }
  }

  async function submitProperty(form, fields) {
    const file = form.querySelector("[data-image-input]").files[0];
    let imageUrl = null;
    if (file) {
      const uploadData = new FormData();
      uploadData.append("image", file);
      const uploadedImage = await api("/uploads/property-image", {
        method: "POST",
        body: uploadData,
      });
      imageUrl = uploadedImage.url;
    }
    // Form inputs are strings. Convert the price before sending it to Java.
    fields.price = Number(fields.price);
    fields.image = imageUrl;
    const property = await api("/properties", { method: "POST", body: fields });
    location.assign(`/properties/${property.id}`);
  }

  async function submitReview(form, fields) {
    await api(`/reviews/${form.dataset.review}`, {
      method: "POST",
      body: { rating: Number(fields.rating), comment: fields.comment || null },
    });
    await refresh("[data-review-list]");
    form.reset();
    notice(document.querySelector(".booking-card"), "Thanks for your review.");
  }

  async function submitBooking(form, fields) {
    await api("/bookings", {
      method: "POST",
      body: {
        propertyId: Number(form.dataset.booking),
        message: fields.message || null,
      },
    });
    form.reset();
    notice(document.querySelector(".booking-card"), "Booking request sent.");
  }

  async function submitRoommateProfile(form, fields) {
    if (!signedIn) {
      throw new Error("Please log in to create a roommate profile.");
    }
    fields.budget = Number(fields.budget);
    await api("/roommates/me", { method: "PUT", body: fields });
    notice(form, "Your roommate profile is live.");
    const searchText = document.querySelector(
      '[data-search="roommates"]',
    ).value;
    await refresh(
      "[data-roommate-results]",
      `/roommates?location=${encodeURIComponent(searchText)}`,
    );
  }

  async function submitMessage(form, fields) {
    if (!fields.text.trim()) {
      return;
    }
    await api(`/messages/${form.dataset.messageRecipient}`, {
      method: "POST",
      body: { text: fields.text },
    });
    const updatedPage = await html(location.href);
    document
      .querySelector("[data-chat-body]")
      .replaceWith(updatedPage.querySelector("[data-chat-body]"));
    document.querySelector(".chat-card header strong").textContent =
      updatedPage.querySelector(".chat-card header strong").textContent;
    form.reset();
  }

  document.addEventListener("submit", async (event) => {
    const form = event.target;
    if (
      !form.matches(
        "[data-auth],[data-create-property],[data-property-details],[data-review],[data-booking],[data-roommate-profile],[data-message-recipient],[data-report],[data-report-review]",
      )
    )
      return;
    event.preventDefault();
    if (form.dataset.submitted === "true") return;
    const button = form.querySelector("button");
    if (button.disabled) return;
    const fields = {};
    for (const [name, value] of new FormData(form).entries()) {
      fields[name] = value;
    }
    const label = button.textContent;
    button.disabled = true;
    if (form.hasAttribute("data-auth")) button.textContent = "Please wait...";
    if (form.hasAttribute("data-create-property"))
      button.textContent = "Uploading and creating...";
    try {
      if (form.hasAttribute("data-auth")) {
        await submitLoginOrRegistration(form, fields);
      } else if (form.hasAttribute("data-create-property")) {
        await submitProperty(form, fields);
      } else if (form.hasAttribute("data-property-details")) {
        await api(`/properties/${form.dataset.propertyDetails}/details`, {
          method: "PATCH",
          body: fields,
        });
        location.assign(`/properties/${form.dataset.propertyDetails}`);
      } else if (form.hasAttribute("data-review")) {
        await submitReview(form, fields);
      } else if (form.hasAttribute("data-booking")) {
        await submitBooking(form, fields);
      } else if (form.hasAttribute("data-roommate-profile")) {
        await submitRoommateProfile(form, fields);
      } else if (form.hasAttribute("data-message-recipient")) {
        await submitMessage(form, fields);
      } else if (form.hasAttribute("data-report")) {
        fields.targetId = Number(fields.targetId);
        const report = await api("/reports", { method: "POST", body: fields });
        form.dataset.submitted = "true";
        const message = notice(form, `Report #${report.id} sent. You can follow its status in your account.`, "form-message success-message");
        message.tabIndex = -1;
        message.focus();
      } else if (form.hasAttribute("data-report-review")) {
        await api(`/admin/reports/${form.dataset.reportReview}`, { method: "PATCH", body: fields });
        await refresh("main");
        const message = notice(document.querySelector("main"), "Report decision saved.");
        message.tabIndex = -1;
        message.focus();
      }
    } catch (error) {
      notice(form.closest(".booking-card") || form, error.message);
    } finally {
      button.disabled = form.dataset.submitted === "true";
      button.textContent = form.dataset.submitted === "true" ? "Report sent" : label;
    }
  });

  let previewUrl;
  document.addEventListener("change", (event) => {
    if (event.target.matches("[data-image-input]")) {
      const input = event.target;
      const file = input.files[0];
      const old = input.closest("form").querySelector(".upload-preview");
      if (old) old.remove();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (file) {
        const preview = document.createElement("img");
        preview.className = "upload-preview";
        preview.alt = "Property preview";
        previewUrl = URL.createObjectURL(file);
        preview.src = previewUrl;
        input.closest("label").after(preview);
      }
    }
    if (event.target.matches("[data-property-type]")) search("properties");
  });
  // Debouncing waits briefly after typing, avoiding a request for every letter.
  let searchTimer;
  document.addEventListener("input", (event) => {
    if (!event.target.matches("[data-search]")) return;
    clearTimeout(searchTimer);
    const kind = event.target.dataset.search;
    searchTimer = setTimeout(
      () => search(kind),
      kind === "properties" ? 250 : 200,
    );
  });
  async function search(kind) {
    // Cancel the previous request so a slower, older result cannot replace a newer one.
    const previousSearch = activeSearches.get(kind);
    if (previousSearch) {
      previousSearch.abort();
    }
    const controller = new AbortController();
    activeSearches.set(kind, controller);
    const parameters = new URLSearchParams();
    const value = document.querySelector(`[data-search="${kind}"]`).value;
    if (value.trim())
      parameters.set(
        kind === "properties" ? "search" : "location",
        value.trim(),
      );
    if (kind === "properties") {
      const type = document.querySelector("[data-property-type]").value;
      if (type) parameters.set("type", type);
    }
    const url = `/${kind}${parameters.size ? "?" + parameters : ""}`;
    try {
      const page = await html(url, controller.signal);
      const selector =
        kind === "properties"
          ? "[data-property-results]"
          : "[data-roommate-results]";
      document
        .querySelector(selector)
        .replaceWith(page.querySelector(selector));
      history.replaceState(null, "", url);
      renderedPath = location.pathname + location.search;
    } catch (error) {
      if (error.name !== "AbortError")
        notice(document.querySelector("main"), error.message);
    }
  }
  // Section links change only the hash. Reloading those loses keyboard focus.
  window.addEventListener("popstate", () => {
    if (location.pathname + location.search !== renderedPath) location.reload();
  });
})();
