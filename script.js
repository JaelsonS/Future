const navToggle = document.querySelector(".nav-toggle");
const navList = document.querySelector(".nav-list");

if (navToggle && navList) {
  navToggle.addEventListener("click", () => {
    const isExpanded = navToggle.getAttribute("aria-expanded") === "true";
    navToggle.setAttribute("aria-expanded", String(!isExpanded));
    navList.classList.toggle("active");
  });

  navList.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      navList.classList.remove("active");
      navToggle.setAttribute("aria-expanded", "false");
    });
  });
}

const focusable = "a, button, input, textarea, select";
const sectionLinks = document.querySelectorAll("a[href^='#']");

sectionLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    const targetId = link.getAttribute("href");
    if (!targetId || targetId === "#") return;
    const target = document.querySelector(targetId);
    if (!target) return;

    event.preventDefault();
    target.scrollIntoView({ behavior: "smooth" });

    const focusTarget = target.querySelector(focusable) || target;
    focusTarget.setAttribute("tabindex", "-1");
    focusTarget.focus({ preventScroll: true });
  });
});

// Aqui estou integrando com o sistema SaaSude usando o ID da clinica (MayaVida).
const CLINIC_ID = "69852d500189392d41556863";
const API_BASE = "https://saasude1-0.onrender.com";

const appointmentTriggers = document.querySelectorAll(".js-appointment-trigger");
const appointmentModal = document.getElementById("appointment-modal");
const appointmentForm = document.getElementById("appointment-form");
const appointmentStatus = document.getElementById("appointment-status");
const appointmentClinic = document.getElementById("appointment-clinic");
const toast = document.getElementById("form-toast");

let lastFocusedElement = null;
let toastTimeout = null;

const getFocusableModalElements = () => {
  if (!appointmentModal) return [];
  return Array.from(
    appointmentModal.querySelectorAll(
      "a, button, input, textarea, select, [tabindex]:not([tabindex='-1'])"
    )
  ).filter((element) => !element.hasAttribute("disabled"));
};

const showToast = (message) => {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("visible");
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove("visible");
  }, 4200);
};

const openModal = () => {
  if (!appointmentModal) return;
  lastFocusedElement = document.activeElement;
  appointmentModal.classList.add("active");
  appointmentModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");

  if (appointmentClinic) {
    appointmentClinic.value = String(CLINIC_ID);
  }

  if (appointmentStatus) {
    appointmentStatus.textContent = "";
    appointmentStatus.classList.remove("error");
  }

  const focusableElements = getFocusableModalElements();
  if (focusableElements.length) {
    focusableElements[0].focus();
  }
};

const closeModal = () => {
  if (!appointmentModal) return;
  appointmentModal.classList.remove("active");
  appointmentModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
    lastFocusedElement.focus();
  }
};

if (appointmentTriggers.length && appointmentModal) {
  appointmentTriggers.forEach((trigger) => {
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      openModal();
    });
  });

  appointmentModal.addEventListener("click", (event) => {
    const target = event.target;
    const closeTrigger = target ? target.closest("[data-modal-close]") : null;
    if (closeTrigger) {
      closeModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (!appointmentModal.classList.contains("active")) return;

    if (event.key === "Escape") {
      event.preventDefault();
      closeModal();
      return;
    }

    if (event.key !== "Tab") return;

    const focusableElements = getFocusableModalElements();
    if (!focusableElements.length) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  });
}

if (appointmentForm) {
  appointmentForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!appointmentForm.checkValidity()) {
      appointmentForm.reportValidity();
      return;
    }

    const submitButton = appointmentForm.querySelector("button[type='submit']");
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Enviando...";
    }

    if (appointmentStatus) {
      appointmentStatus.textContent = "";
      appointmentStatus.classList.remove("error");
    }

    const fields = appointmentForm.elements;
    const preferredDate = fields["preferred_date"].value.trim();
    const preferredTime = fields["preferred_time"].value.trim();
    let notes = fields["notes"].value.trim();

    const preferredParts = [];
    if (preferredDate) {
      preferredParts.push(`Data desejada: ${preferredDate}`);
    }
    if (preferredTime) {
      preferredParts.push(`Horario desejado: ${preferredTime}`);
    }
    if (preferredParts.length) {
      const preferredText = preferredParts.join(" • ");
      notes = notes ? `${notes}\n${preferredText}` : preferredText;
    }

    const payload = {
      clinicId: CLINIC_ID,
      patientName: fields["name"].value.trim(),
      phone: fields["phone"].value.trim(),
      email: fields["email"].value.trim() || undefined,
      requestType: fields["type"].value.toUpperCase(),
      notes: notes || undefined,
    };

    try {
      const response = await fetch(
        `${API_BASE}/api/public/appointment-requests`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error("request-failed");
      }

      showToast(
        "Pedido enviado com sucesso. A clínica entrará em contacto para confirmar o agendamento."
      );
      appointmentForm.reset();
      if (appointmentClinic) {
        appointmentClinic.value = String(CLINIC_ID);
      }
      closeModal();
    } catch (error) {
      if (appointmentStatus) {
        appointmentStatus.textContent =
          "Não foi possível enviar agora. Tente novamente ou fale conosco pelo WhatsApp.";
        appointmentStatus.classList.add("error");
      }
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Enviar pedido";
      }
    }
  });
}