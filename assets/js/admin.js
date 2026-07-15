/* ============================================================
   Valleblond Photography
   Studio — Sprints 1 à 3
   ============================================================ */

const app = document.getElementById("app");

function renderLogin(message = "") {
    app.innerHTML = `
        <main class="login">
            <form class="login-box" id="login-form" novalidate>
                <p class="eyebrow">VALLEBLOND PHOTOGRAPHY</p>
                <h1 class="display">Studio</h1>
                <p class="login-intro">Accès réservé à l'administration.</p>
                <p class="form-message" id="form-message" aria-live="polite"></p>
                <label for="email">Adresse email</label>
                <input id="email" name="email" type="email" autocomplete="email" required>
                <label for="password">Mot de passe</label>
                <input id="password" name="password" type="password" autocomplete="current-password" required>
                <button class="btn btn-primary" id="login-button" type="submit">Se connecter</button>
            </form>
        </main>
    `;

    const form = document.getElementById("login-form");
    const messageElement = document.getElementById("form-message");

    messageElement.textContent = message;

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const email = form.email.value.trim();
        const password = form.password.value;
        const button = document.getElementById("login-button");

        if (!email || !password) {
            messageElement.textContent = "Renseignez votre adresse email et votre mot de passe.";
            return;
        }

        button.disabled = true;
        button.textContent = "Connexion…";
        messageElement.textContent = "";

        const result = await signIn(email, password);

        if (!result.success) {
            button.disabled = false;
            button.textContent = "Se connecter";
            messageElement.textContent = "La connexion a échoué. Vérifiez vos identifiants.";
            return;
        }

        await initStudio();
    });
}

function renderAccessDenied(setupRequired) {
    const message = setupRequired
        ? "L'accès Studio n'est pas encore activé. Exécutez le fichier supabase/setup-studio.sql une seule fois."
        : "Ce compte est connecté, mais il n'est pas autorisé à accéder au Studio.";

    app.innerHTML = `
        <main class="login">
            <section class="login-box access-denied" aria-labelledby="denied-title">
                <p class="eyebrow">VALLEBLOND PHOTOGRAPHY</p>
                <h1 class="display" id="denied-title">Accès restreint</h1>
                <p>${message}</p>
                <button class="btn btn-primary" id="logout-button" type="button">Se déconnecter</button>
            </section>
        </main>
    `;

    document.getElementById("logout-button").addEventListener("click", async () => {
        await signOut();
        renderLogin("Vous êtes déconnecté.");
    });
}

function renderStudioShell(user, activeView, content) {
    app.innerHTML = `
        <div class="studio">
            <aside class="sidebar">
                <a class="studio-brand display" href="../../index.html">Valleblond</a>
                <p class="studio-label">PHOTOGRAPHY · STUDIO</p>
                <nav class="studio-nav" aria-label="Navigation du Studio">
                    <button class="${activeView === "dashboard" ? "is-active" : ""}" data-view="dashboard" type="button" ${activeView === "dashboard" ? 'aria-current="page"' : ""}>Vue d'ensemble</button>
                    <button class="${activeView === "artworks" ? "is-active" : ""}" data-view="artworks" type="button" ${activeView === "artworks" ? 'aria-current="page"' : ""}>Œuvres</button>
                    <button class="${activeView === "artwork" ? "is-active" : ""}" data-view="artwork" type="button" ${activeView === "artwork" ? 'aria-current="page"' : ""}>Créer une œuvre</button>
                    <button class="${activeView === "uploads" ? "is-active" : ""}" data-view="uploads" type="button" ${activeView === "uploads" ? 'aria-current="page"' : ""}>Ajouter une preview</button>
                    <button class="${activeView === "orders" ? "is-active" : ""}" data-view="orders" type="button" ${activeView === "orders" ? 'aria-current="page"' : ""}>Commandes</button>
                    <button class="${activeView === "accounting" ? "is-active" : ""}" data-view="accounting" type="button" ${activeView === "accounting" ? 'aria-current="page"' : ""}>Comptabilité</button>
                    <button type="button" disabled title="Disponible au sprint Collections">Collections</button>
                </nav>
                <button class="logout-button" id="logout-button" type="button">Se déconnecter</button>
            </aside>
            <main class="content">${content}</main>
        </div>
    `;

    document.getElementById("logout-button").addEventListener("click", async () => {
        await signOut();
        renderLogin("Vous êtes déconnecté.");
    });

    document.querySelectorAll("[data-view]").forEach((button) => {
        button.addEventListener("click", () => {
            if (button.dataset.view === "dashboard") {
                renderDashboard(user);
                return;
            }

            if (button.dataset.view === "artwork") {
                renderArtworkCreation(user);
                return;
            }

            if (button.dataset.view === "artworks") {
                renderArtworkList(user);
                return;
            }

            if (button.dataset.view === "orders") {
                renderOrders(user);
                return;
            }

            if (button.dataset.view === "accounting") {
                renderAccounting(user);
                return;
            }

            renderPreviewUpload(user);
        });
    });
}

function formatArtworkDate(dateString) {
    return new Intl.DateTimeFormat("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric"
    }).format(new Date(dateString));
}

function renderRecentArtworks(artworks) {
    const container = document.getElementById("recent-artworks");
    const emptyState = document.getElementById("recent-empty");

    container.replaceChildren();

    if (!artworks.length) {
        emptyState.hidden = false;
        return;
    }

    emptyState.hidden = true;

    artworks.forEach((artwork) => {
        const article = document.createElement("article");
        const image = document.createElement("img");
        const details = document.createElement("div");
        const title = document.createElement("h3");
        const location = document.createElement("p");
        const date = document.createElement("time");

        article.className = "artwork-card";
        details.className = "artwork-card-details";
        image.alt = artwork.title || "Œuvre sans titre";
        image.loading = "lazy";
        image.src = artwork.image_url || "";
        title.className = "display";
        title.textContent = artwork.title || "Sans titre";
        location.textContent = artwork.location || "Lieu non renseigné";
        date.dateTime = artwork.created_at || "";
        date.textContent = artwork.created_at ? `Ajoutée le ${formatArtworkDate(artwork.created_at)}` : "Date inconnue";

        details.append(title, location, date);
        article.append(image, details);
        container.append(article);
    });
}

async function loadDashboard() {
    const [recentResponse, digitalResponse, printResponse] = await Promise.all([
        supabaseClient
            .from(CONFIG.ARTWORKS_TABLE)
            .select("id, title, location, image_url, created_at", { count: "exact" })
            .order("created_at", { ascending: false })
            .limit(4),
        supabaseClient
            .from(CONFIG.ARTWORKS_TABLE)
            .select("id", { count: "exact", head: true })
            .not("price_digital", "is", null),
        supabaseClient
            .from(CONFIG.ARTWORKS_TABLE)
            .select("id", { count: "exact", head: true })
            .not("price_physical", "is", null)
    ]);

    const status = document.getElementById("dashboard-status");

    if (recentResponse.error || digitalResponse.error || printResponse.error) {
        console.error("Impossible de charger le dashboard :", {
            recent: recentResponse.error,
            digital: digitalResponse.error,
            print: printResponse.error
        });
        document.getElementById("artwork-count").textContent = "—";
        document.getElementById("digital-count").textContent = "—";
        document.getElementById("print-count").textContent = "—";
        status.textContent = "Le catalogue est momentanément indisponible.";
        status.hidden = false;
        return;
    }

    const artworks = recentResponse.data || [];

    document.getElementById("artwork-count").textContent = recentResponse.count ?? 0;
    document.getElementById("digital-count").textContent = digitalResponse.count ?? 0;
    document.getElementById("print-count").textContent = printResponse.count ?? 0;
    renderRecentArtworks(artworks);
}

function renderDashboard(user) {
    renderStudioShell(user, "dashboard", `
        <p class="eyebrow">STUDIO</p>
        <h1 class="display">Bonjour, Valentin.</h1>
        <p class="account-name">Connecté avec <span id="user-email"></span></p>
        <p class="dashboard-intro">Le catalogue est vivant. Retrouvez ici les dernières œuvres publiées et les options de vente actuellement actives.</p>
        <p class="dashboard-status" id="dashboard-status" role="status" hidden></p>
        <section class="dashboard-grid" aria-label="Résumé du catalogue">
            <article class="stat-card">
                <p>Œuvres dans le catalogue</p>
                <strong id="artwork-count">…</strong>
            </article>
            <article class="stat-card">
                <p>Avec fichier numérique</p>
                <strong id="digital-count">…</strong>
            </article>
            <article class="stat-card">
                <p>Avec tirage disponible</p>
                <strong id="print-count">…</strong>
            </article>
        </section>
        <section class="recent-section" aria-labelledby="recent-title">
            <div class="section-heading">
                <div>
                    <p class="eyebrow">CATALOGUE</p>
                    <h2 class="display" id="recent-title">Œuvres récentes</h2>
                </div>
                <span>Les quatre dernières ajoutées</span>
            </div>
            <p class="empty-state" id="recent-empty" hidden>Le catalogue est vide. L’ajout d’une première œuvre sera disponible au Sprint 4.</p>
            <div class="artwork-list" id="recent-artworks"></div>
        </section>
    `);

    document.getElementById("user-email").textContent = user.email || "";
    loadDashboard();
}

function formatFileSize(size) {
    return `${(size / 1024 / 1024).toFixed(1)} Mo`;
}

function getFileExtension(file) {
    const extension = file.name.split(".").pop().toLowerCase();

    return extension === "jpg" ? "jpg" : extension;
}

function createStorageFileName(extension) {
    const uniqueId = window.crypto?.randomUUID
        ? window.crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    return `previews/${uniqueId}.${extension}`;
}

function createSlug(title) {
    const slug = title
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

    return slug || "oeuvre";
}

function createPendingUploadOption(upload) {
    const label = document.createElement("label");
    const input = document.createElement("input");
    const image = document.createElement("img");
    const details = document.createElement("span");
    const name = document.createElement("strong");
    const date = document.createElement("span");
    const publicUrl = supabaseClient.storage
        .from(CONFIG.ARTWORKS_BUCKET)
        .getPublicUrl(upload.storage_path)
        .data.publicUrl;

    label.className = "preview-choice";
    input.name = "upload-id";
    input.type = "radio";
    input.value = upload.id;
    image.alt = `Preview : ${upload.original_name}`;
    image.loading = "lazy";
    image.src = publicUrl;
    details.className = "preview-choice-details";
    name.textContent = upload.original_name;
    date.textContent = upload.created_at ? `Envoyée le ${formatArtworkDate(upload.created_at)}` : "Preview en attente";

    input.addEventListener("change", () => {
        document.querySelectorAll(".preview-choice").forEach((choice) => {
            choice.classList.remove("is-selected");
        });
        label.classList.add("is-selected");
        document.getElementById("create-artwork-button").disabled = false;
    });

    details.append(name, date);
    label.append(input, image, details);

    return label;
}

async function loadPendingUploads() {
    const container = document.getElementById("pending-uploads");
    const message = document.getElementById("artwork-message");
    const button = document.getElementById("create-artwork-button");
    const { data, error } = await supabaseClient
        .from(CONFIG.UPLOADS_TABLE)
        .select("id, storage_path, original_name, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

    container.replaceChildren();

    if (error) {
        console.error("Impossible de charger les previews en attente :", error);
        message.textContent = "Les previews sont momentanément indisponibles.";
        return;
    }

    if (!data.length) {
        container.innerHTML = '<p class="empty-state">Aucune preview en attente. Ajoutez une image avant de créer une œuvre.</p>';
        return;
    }

    data.forEach((upload) => {
        container.append(createPendingUploadOption(upload));
    });

    button.disabled = true;
}

function renderArtworkCreation(user, successMessage = "") {
    const currentYear = new Date().getFullYear() + 1;

    renderStudioShell(user, "artwork", `
        <p class="eyebrow">NOUVELLE ŒUVRE</p>
        <h1 class="display">Créer une œuvre</h1>
        <p class="dashboard-intro">Choisissez une preview, renseignez les informations de l’œuvre, puis décidez si elle doit apparaître immédiatement dans la galerie.</p>
        <form class="artwork-form" id="artwork-form" novalidate>
            <fieldset class="form-section">
                <legend class="display">1. Choisir la preview</legend>
                <div class="preview-choices" id="pending-uploads" aria-live="polite"></div>
            </fieldset>
            <fieldset class="form-section">
                <legend class="display">2. Informations</legend>
                <div class="form-grid">
                    <label class="form-field form-field-wide">Titre
                        <input id="artwork-title" name="title" type="text" maxlength="140" required>
                    </label>
                    <label class="form-field">Lieu
                        <input id="artwork-location" name="location" type="text" maxlength="140" placeholder="Amiens, France">
                    </label>
                    <label class="form-field">Année
                        <input id="artwork-year" name="year" type="number" min="1800" max="${currentYear}" placeholder="2026">
                    </label>
                    <label class="form-field form-field-wide">Description
                        <textarea id="artwork-description" name="description" rows="5" maxlength="1200"></textarea>
                    </label>
                </div>
            </fieldset>
            <fieldset class="form-section">
                <legend class="display">3. Vente et publication</legend>
                <div class="form-grid">
                    <label class="form-field form-field-wide">Format de tirage
                        <input id="artwork-format" name="format" type="text" maxlength="140" placeholder="Ex. Tirage fine art · 30 × 40 cm">
                    </label>
                    <label class="form-field">Prix numérique (€)
                        <input id="price-digital" name="price-digital" type="number" min="0" step="0.01" inputmode="decimal" placeholder="18">
                    </label>
                    <label class="form-field">Prix tirage (€)
                        <input id="price-physical" name="price-physical" type="number" min="0" step="0.01" inputmode="decimal" placeholder="35">
                    </label>
                </div>
                <label class="publish-toggle" for="is-published">
                    <input id="is-published" name="is-published" type="checkbox" checked>
                    <span>Publier l’œuvre dans la galerie dès sa création</span>
                </label>
            </fieldset>
            <p class="form-message" id="artwork-message" aria-live="polite"></p>
            <button class="btn btn-primary" id="create-artwork-button" type="submit" disabled>Créer l’œuvre</button>
        </form>
    `);

    const form = document.getElementById("artwork-form");
    const message = document.getElementById("artwork-message");

    if (successMessage) {
        message.classList.add("is-success");
        message.textContent = successMessage;
    }

    loadPendingUploads();

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const selectedUpload = form.querySelector('input[name="upload-id"]:checked');
        const title = document.getElementById("artwork-title").value.trim();
        const location = document.getElementById("artwork-location").value;
        const yearValue = document.getElementById("artwork-year").value;
        const description = document.getElementById("artwork-description").value;
        const format = document.getElementById("artwork-format").value;
        const digitalValue = document.getElementById("price-digital").value;
        const physicalValue = document.getElementById("price-physical").value;
        const button = document.getElementById("create-artwork-button");

        if (!selectedUpload || !title) {
            message.textContent = "Choisissez une preview et indiquez le titre de l’œuvre.";
            return;
        }

        button.disabled = true;
        button.textContent = "Création en cours…";
        message.classList.remove("is-success");
        message.textContent = "";

        const { data: artworkId, error } = await supabaseClient.rpc("create_artwork_from_upload", {
            p_upload_id: selectedUpload.value,
            p_title: title,
            p_slug: createSlug(title),
            p_location: location,
            p_year: yearValue ? Number(yearValue) : null,
            p_description: description,
            p_format: format,
            p_price_digital: digitalValue ? Number(digitalValue) : null,
            p_price_physical: physicalValue ? Number(physicalValue) : null,
            p_is_published: form["is-published"].checked
        });

        if (error) {
            console.error("Impossible de créer l’œuvre :", error);
            button.disabled = false;
            button.textContent = "Créer l’œuvre";
            message.textContent = "L’œuvre n’a pas pu être créée. Vérifiez les informations puis réessayez.";
            return;
        }

        const publicationText = form["is-published"].checked
            ? "L’œuvre est maintenant visible dans la galerie."
            : "L’œuvre a été enregistrée comme brouillon.";

        renderArtworkCreation(user, `${publicationText} Référence : ${artworkId}.`);
    });
}

function createArtworkListItem(artwork, user) {
    const article = document.createElement("article");
    const image = document.createElement("img");
    const details = document.createElement("div");
    const title = document.createElement("h3");
    const metadata = document.createElement("p");
    const status = document.createElement("span");
    const actions = document.createElement("div");
    const editButton = document.createElement("button");
    const deleteButton = document.createElement("button");

    article.className = "studio-artwork-item";
    image.alt = artwork.title || "Œuvre sans titre";
    image.loading = "lazy";
    image.src = artwork.image_url || "";
    details.className = "studio-artwork-details";
    title.className = "display";
    title.textContent = artwork.title || "Sans titre";
    metadata.textContent = [artwork.location, artwork.year].filter(Boolean).join(" · ") || "Informations à compléter";
    status.className = artwork.is_published ? "artwork-status is-published" : "artwork-status";
    status.textContent = artwork.is_published ? "Publiée" : "Brouillon";
    actions.className = "artwork-item-actions";
    editButton.className = "btn artwork-edit-button";
    editButton.type = "button";
    editButton.textContent = "Modifier";
    editButton.addEventListener("click", () => renderArtworkEditor(user, artwork.id));
    deleteButton.className = "btn artwork-delete-button";
    deleteButton.type = "button";
    deleteButton.textContent = "Supprimer";
    deleteButton.addEventListener("click", () => openDeleteDialog(user, artwork));

    details.append(title, metadata, status);
    actions.append(editButton, deleteButton);
    article.append(image, details, actions);

    return article;
}

async function loadArtworkList(user) {
    const container = document.getElementById("studio-artwork-list");
    const status = document.getElementById("artwork-list-status");
    const cleanedPreviews = await retryOrphanedPreviewCleanup();
    const { data, error } = await supabaseClient
        .from(CONFIG.ARTWORKS_TABLE)
        .select("id, title, location, year, image_url, is_published, created_at")
        .order("created_at", { ascending: false });

    container.replaceChildren();

    if (error) {
        console.error("Impossible de charger les œuvres :", error);
        status.textContent = "Les œuvres sont momentanément indisponibles.";
        return;
    }

    if (!data.length) {
        container.innerHTML = '<p class="empty-state">Aucune œuvre n’a encore été créée.</p>';
        return;
    }

    if (cleanedPreviews) {
        status.classList.add("is-success");
        status.textContent = "Une preview résiduelle a été nettoyée automatiquement.";
    }

    data.forEach((artwork) => container.append(createArtworkListItem(artwork, user)));
}

async function retryOrphanedPreviewCleanup() {
    const { data: orphanedUploads, error } = await supabaseClient
        .from(CONFIG.UPLOADS_TABLE)
        .select("id, storage_path")
        .eq("status", "orphaned");

    if (error || !orphanedUploads?.length) {
        return 0;
    }

    let cleanedCount = 0;

    for (const upload of orphanedUploads) {
        const { error: storageError } = await supabaseClient.storage
            .from(CONFIG.ARTWORKS_BUCKET)
            .remove([upload.storage_path]);

        if (storageError) {
            console.error("Impossible de nettoyer une preview résiduelle :", storageError);
            continue;
        }

        const { error: databaseError } = await supabaseClient
            .from(CONFIG.UPLOADS_TABLE)
            .delete()
            .eq("id", upload.id);

        if (!databaseError) {
            cleanedCount += 1;
        }
    }

    return cleanedCount;
}

function renderArtworkList(user, successMessage = "") {
    renderStudioShell(user, "artworks", `
        <p class="eyebrow">CATALOGUE</p>
        <h1 class="display">Œuvres</h1>
        <p class="dashboard-intro">Modifiez les informations, les prix, le statut de publication ou l’image de chaque œuvre.</p>
        <p class="form-message" id="artwork-list-status" aria-live="polite"></p>
        <section class="studio-artwork-list" id="studio-artwork-list" aria-label="Liste des œuvres"></section>
    `);

    if (successMessage) {
        const status = document.getElementById("artwork-list-status");
        status.classList.add("is-success");
        status.textContent = successMessage;
    }

    loadArtworkList(user);
}

function localDeliveryStatus(status) {
    return {
        requested: "À valider",
        approved: "Zone validée · paiement à la remise",
        rejected: "Refusée",
        paid_in_person: "Payée en main propre",
        delivered: "Livrée"
    }[status] || status;
}

async function processLocalDeliveryRequest(user, requestId, action) {
    const { error } = await supabaseClient.rpc("process_local_delivery_request", {
        p_request_id: requestId,
        p_action: action
    });

    if (error) {
        console.error("Impossible de traiter la livraison locale :", error);
        alert("Cette action n’a pas pu être enregistrée. Réessayez.");
        return;
    }

    renderOrders(user);
}

function createLocalDeliveryAction(user, request, label, action) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn";
    button.textContent = label;
    button.addEventListener("click", () => processLocalDeliveryRequest(user, request.id, action));
    return button;
}

function renderLocalDeliveryRequests(user, requests, error) {
    const list = document.getElementById("local-delivery-list");

    if (error) {
        list.textContent = "Les demandes locales seront disponibles après l’activation de la fonctionnalité.";
        return;
    }

    if (!requests.length) {
        list.textContent = "Aucune demande de livraison locale pour le moment.";
        return;
    }

    list.replaceChildren();

    requests.forEach((request) => {
        const row = document.createElement("article");
        const summary = document.createElement("p");
        const details = document.createElement("p");
        const status = document.createElement("p");
        const actions = document.createElement("div");

        row.className = "studio-order-item";
        summary.className = "studio-order-summary";
        details.className = "studio-order-delivery";
        status.className = "studio-order-delivery";
        actions.className = "artwork-item-actions";

        summary.textContent = `Livraison personnelle · ${request.Artworks?.title || "Œuvre"} · ${request.buyer_name} · ${request.buyer_email} · ${formatArtworkDate(request.created_at)}`;
        details.textContent = `Adresse à vérifier : ${[request.address_line, request.postal_code, request.city].filter(Boolean).join(", ")}${request.buyer_phone ? ` · ${request.buyer_phone}` : ""}`;
        status.textContent = `Statut : ${localDeliveryStatus(request.status)}`;
        row.append(summary, details, status);

        if (request.status === "requested") {
            actions.append(
                createLocalDeliveryAction(user, request, "Valider la zone", "approve"),
                createLocalDeliveryAction(user, request, "Refuser", "reject")
            );
        } else if (request.status === "approved") {
            actions.append(createLocalDeliveryAction(user, request, "Confirmer le paiement reçu", "mark_paid_in_person"));
        } else if (request.status === "paid_in_person") {
            actions.append(createLocalDeliveryAction(user, request, "Marquer comme livrée", "mark_delivered"));
        }

        if (actions.childElementCount) row.append(actions);
        list.append(row);
    });
}

async function renderOrders(user) {
    renderStudioShell(user, "orders", '<p class="eyebrow">VENTES</p><h1 class="display">Commandes</h1><p class="dashboard-intro">Les demandes de livraison personnelle sont validées ici avant toute remise. Un paiement en main propre est confirmé uniquement lorsque vous l’avez réellement reçu.</p><section><p class="eyebrow">LIVRAISONS LOCALES</p><div class="studio-artwork-list" id="local-delivery-list"></div></section><section><p class="eyebrow">PAIEMENTS CONFIRMÉS</p><div class="studio-artwork-list" id="orders-list"></div></section>');
    const list = document.getElementById("orders-list");
    const localList = document.getElementById("local-delivery-list");
    list.textContent = "Chargement des commandes…";
    localList.textContent = "Chargement des demandes…";

    const [digitalResult, printResult, localResult] = await Promise.all([
        supabaseClient.from("digital_orders").select("buyer_email, amount, currency, status, paypal_environment, created_at, Artworks(title)").order("created_at", { ascending: false }),
        supabaseClient.from("print_orders").select("buyer_email, amount, currency, status, paypal_environment, created_at, shipping_address, shipping_zone, shipping_amount, Artworks(title)").order("created_at", { ascending: false }),
        supabaseClient.from("local_delivery_requests").select("id, buyer_name, buyer_email, buyer_phone, address_line, postal_code, city, payment_preference, payment_method, status, created_at, Artworks(title)").order("created_at", { ascending: false })
    ]);

    renderLocalDeliveryRequests(user, localResult.data || [], localResult.error);

    if (digitalResult.error && printResult.error) {
        list.textContent = "Les commandes sont indisponibles.";
        return;
    }

    const orders = [
        ...(digitalResult.data || []).map((order) => ({ ...order, type: "numérique" })),
        ...(printResult.data || []).map((order) => ({ ...order, type: "tirage" }))
    ].sort((first, second) => new Date(second.created_at) - new Date(first.created_at));

    if (!orders.length) {
        list.textContent = "Aucune commande pour le moment.";
        return;
    }

    list.innerHTML = "";
    orders.forEach((order) => {
        const row = document.createElement("article");
        row.className = "studio-order-item";

        const details = document.createElement("p");
        details.className = "studio-order-summary";
        details.textContent = `${order.type === "tirage" ? "Tirage physique" : "Fichier numérique"} · ${order.Artworks?.title || "Œuvre"} · ${order.amount} ${order.currency} · ${order.buyer_email || "Email indisponible"} · ${formatArtworkDate(order.created_at)}`;
        row.append(details);

        if (order.paypal_environment === "sandbox") {
            const testStatus = document.createElement("p");
            testStatus.className = "studio-order-delivery";
            testStatus.textContent = "Test PayPal Sandbox — exclu du registre comptable.";
            row.append(testStatus);
        }

        if (order.type === "tirage") {
            const address = order.shipping_address?.address;
            const recipient = order.shipping_address?.name?.full_name;
            const delivery = document.createElement("p");
            delivery.className = "studio-order-delivery";
            delivery.style.margin = "8px 0 0";
            delivery.style.color = "var(--slate-soft)";
            delivery.textContent = address
                ? `Livraison : ${recipient ? `${recipient}, ` : ""}${[address.address_line_1, address.address_line_2, address.postal_code, address.admin_area_2, address.country_code].filter(Boolean).join(", ")}`
                : "Adresse de livraison à confirmer avec l’acheteur.";
            row.append(delivery);

            if (order.shipping_address?.pickup_point) {
                const pickup = document.createElement("p");
                pickup.className = "studio-order-delivery";
                pickup.style.margin = "4px 0 0";
                pickup.style.color = "var(--slate-soft)";
                pickup.textContent = `Point relais souhaité : ${order.shipping_address.pickup_point}`;
                row.append(pickup);
            }

            if (order.shipping_zone) {
                const shipping = document.createElement("p");
                shipping.className = "studio-order-delivery";
                shipping.style.margin = "4px 0 0";
                shipping.style.color = "var(--slate-soft)";
                shipping.textContent = `${order.shipping_zone} · frais de livraison ${Number(order.shipping_amount || 0).toFixed(2)} €`;
                row.append(shipping);
            }
        }

        list.append(row);
    });
}

function formatAccountingAmount(amount, currency = "EUR") {
    return new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency: currency || "EUR"
    }).format(Number(amount || 0));
}

function formatCsvValue(value) {
    let normalized = String(value ?? "").replace(/\r?\n/g, " ");

    // Empêche qu'une valeur venant d'un client soit interprétée comme une
    // formule à l'ouverture du CSV dans Excel ou Numbers.
    if (/^[=+\-@]/.test(normalized)) normalized = `'${normalized}`;

    return `"${normalized.replace(/"/g, '""')}"`;
}

function getAccountingMonthBounds(monthValue) {
    if (!/^\d{4}-\d{2}$/.test(monthValue)) return null;

    const [year, month] = monthValue.split("-").map(Number);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    return { start, end };
}

function filterAccountingEntries(entries, monthValue) {
    const bounds = getAccountingMonthBounds(monthValue);

    if (!bounds) return entries;

    return entries.filter((entry) => {
        const date = new Date(entry.date);
        return date >= bounds.start && date < bounds.end;
    });
}

function createAccountingEntry(data) {
    const article = document.createElement("article");
    const dateColumn = document.createElement("div");
    const saleColumn = document.createElement("div");
    const amount = document.createElement("p");
    const date = document.createElement("time");
    const type = document.createElement("p");
    const title = document.createElement("strong");
    const client = document.createElement("p");
    const reference = document.createElement("p");

    article.className = "accounting-entry";
    date.dateTime = data.date;
    date.textContent = formatArtworkDate(data.date);
    type.textContent = data.type;
    title.textContent = data.artworkTitle || "Œuvre sans titre";
    client.textContent = data.buyerEmail || "Client non renseigné";
    reference.textContent = `Réf. ${data.reference}`;
    amount.className = "accounting-amount";
    amount.textContent = formatAccountingAmount(data.amount, data.currency);

    dateColumn.append(date);
    saleColumn.append(type, title, client, reference);
    article.append(dateColumn, saleColumn, amount);

    return article;
}

function renderAccountingEntries(entries, monthValue) {
    const list = document.getElementById("accounting-list");
    const total = document.getElementById("accounting-total");
    const count = document.getElementById("accounting-count");
    const period = document.getElementById("accounting-period");
    const exportButton = document.getElementById("accounting-export");
    const filteredEntries = filterAccountingEntries(entries, monthValue);
    const totalAmount = filteredEntries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
    const bounds = getAccountingMonthBounds(monthValue);

    total.textContent = formatAccountingAmount(totalAmount);
    count.textContent = filteredEntries.length;
    period.textContent = bounds
        ? new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(bounds.start)
        : "toutes périodes";
    exportButton.disabled = !filteredEntries.length;
    exportButton.onclick = () => exportAccountingCsv(filteredEntries, monthValue);

    list.replaceChildren();

    if (!filteredEntries.length) {
        list.innerHTML = '<p class="empty-state">Aucun paiement encaissé sur cette période.</p>';
        return;
    }

    filteredEntries.forEach((entry) => list.append(createAccountingEntry(entry)));
}

function exportAccountingCsv(entries, monthValue) {
    const header = ["Date d’encaissement", "Référence", "Type", "Œuvre", "Client", "Montant encaissé", "Devise", "Moyen de paiement", "Statut"];
    const rows = entries.map((entry) => [
        new Date(entry.date).toLocaleDateString("fr-FR"),
        entry.reference,
        entry.type,
        entry.artworkTitle || "Œuvre sans titre",
        entry.buyerEmail || "",
        Number(entry.amount || 0).toFixed(2).replace(".", ","),
        entry.currency || "EUR",
        entry.paymentMethod,
        "Encaissé"
    ]);
    const csv = [header, ...rows]
        .map((row) => row.map(formatCsvValue).join(";"))
        .join("\r\n");
    const file = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
    const download = document.createElement("a");
    const url = URL.createObjectURL(file);
    const filePeriod = /^\d{4}-\d{2}$/.test(monthValue) ? monthValue : "complet";

    download.href = url;
    download.download = `valleblond-registre-recettes-${filePeriod}.csv`;
    document.body.append(download);
    download.click();
    download.remove();
    URL.revokeObjectURL(url);
}

async function loadAccounting(monthValue) {
    const status = document.getElementById("accounting-status");
    const [digitalResult, printResult, localResult] = await Promise.all([
        supabaseClient
            .from("digital_orders")
            .select("id, paypal_capture_id, buyer_email, amount, currency, completed_at, Artworks(title)")
            .eq("status", "completed")
            .eq("paypal_environment", "live")
            .order("completed_at", { ascending: false }),
        supabaseClient
            .from("print_orders")
            .select("id, paypal_capture_id, buyer_email, amount, currency, completed_at, Artworks(title)")
            .eq("status", "completed")
            .eq("paypal_environment", "live")
            .order("completed_at", { ascending: false }),
        supabaseClient
            .from("local_delivery_requests")
            .select("id, buyer_email, artwork_title, amount, currency, paid_at, status, Artworks(title)")
            .in("status", ["paid_in_person", "delivered"])
            .order("paid_at", { ascending: false })
    ]);

    if (digitalResult.error || printResult.error || localResult.error) {
        console.error("Impossible de charger le registre comptable :", {
            digital: digitalResult.error,
            print: printResult.error,
            local: localResult.error
        });
        status.textContent = "Le registre est indisponible. Vérifiez que supabase/setup-accounting.sql a bien été exécuté.";
        return;
    }

    const entries = [
        ...(digitalResult.data || []).map((order) => ({
            date: order.completed_at,
            reference: order.paypal_capture_id || order.id,
            type: "Fichier numérique",
            artworkTitle: order.Artworks?.title,
            buyerEmail: order.buyer_email,
            amount: order.amount,
            currency: order.currency,
            paymentMethod: "PayPal"
        })),
        ...(printResult.data || []).map((order) => ({
            date: order.completed_at,
            reference: order.paypal_capture_id || order.id,
            type: "Tirage physique",
            artworkTitle: order.Artworks?.title,
            buyerEmail: order.buyer_email,
            amount: order.amount,
            currency: order.currency,
            paymentMethod: "PayPal"
        })),
        ...(localResult.data || []).filter((order) => order.amount !== null && order.paid_at).map((order) => ({
            date: order.paid_at,
            reference: order.id,
            type: "Livraison personnelle",
            artworkTitle: order.artwork_title || order.Artworks?.title,
            buyerEmail: order.buyer_email,
            amount: order.amount,
            currency: order.currency || "EUR",
            paymentMethod: "Paiement en main propre"
        }))
    ].filter((entry) => entry.date).sort((first, second) => new Date(second.date) - new Date(first.date));

    renderAccountingEntries(entries, monthValue);
}

function renderAccounting(user) {
    const currentMonth = new Date().toISOString().slice(0, 7);

    renderStudioShell(user, "accounting", `
        <p class="eyebrow">REGISTRE DES RECETTES</p>
        <h1 class="display">Comptabilité</h1>
        <p class="dashboard-intro">Les paiements confirmés sont regroupés automatiquement. L’export contient uniquement les montants encaissés, sans adresse client ni frais PayPal.</p>
        <div class="accounting-toolbar">
            <label class="form-field" for="accounting-month">Période
                <input id="accounting-month" type="month" value="${currentMonth}">
            </label>
            <button class="btn btn-primary" id="accounting-export" type="button" disabled>Exporter pour Excel</button>
        </div>
        <p class="form-message" id="accounting-status" aria-live="polite"></p>
        <section class="accounting-summary" aria-label="Résumé des recettes">
            <article class="accounting-card"><p>Recettes encaissées</p><strong id="accounting-total">…</strong></article>
            <article class="accounting-card"><p>Paiements enregistrés</p><strong id="accounting-count">…</strong></article>
            <article class="accounting-card"><p>Période affichée</p><strong id="accounting-period">…</strong></article>
        </section>
        <section class="recent-section" aria-labelledby="accounting-title">
            <div class="section-heading"><div><p class="eyebrow">ENCAISSEMENTS</p><h2 class="display" id="accounting-title">Registre</h2></div><span>Export CSV compatible Excel et Numbers</span></div>
            <div class="accounting-list" id="accounting-list">Chargement du registre…</div>
        </section>
    `);

    const monthInput = document.getElementById("accounting-month");
    monthInput.addEventListener("change", () => loadAccounting(monthInput.value));
    loadAccounting(currentMonth);
}

function openDeleteDialog(user, artwork) {
    const dialog = document.createElement("dialog");

    dialog.className = "delete-dialog";
    dialog.innerHTML = `
        <form method="dialog" class="delete-dialog-content" id="delete-artwork-form">
            <p class="eyebrow">SUPPRESSION DÉFINITIVE</p>
            <h2 class="display">Supprimer cette œuvre ?</h2>
            <p>Cette action retirera l’œuvre de la galerie et supprimera sa preview associée. Elle est irréversible.</p>
            <label class="form-field" for="delete-confirmation">Pour confirmer, saisissez le titre exact de l’œuvre.
                <input id="delete-confirmation" type="text" autocomplete="off">
            </label>
            <p class="form-message" id="delete-message" aria-live="polite"></p>
            <div class="editor-actions">
                <button class="btn" value="cancel" type="submit">Annuler</button>
                <button class="btn artwork-delete-button" id="confirm-delete-button" value="default" type="button" disabled>Supprimer définitivement</button>
            </div>
        </form>
    `;

    document.body.append(dialog);

    const confirmation = dialog.querySelector("#delete-confirmation");
    const confirmButton = dialog.querySelector("#confirm-delete-button");
    const message = dialog.querySelector("#delete-message");
    const expectedTitle = artwork.title || "Sans titre";

    confirmation.addEventListener("input", () => {
        confirmButton.disabled = confirmation.value.trim() !== expectedTitle;
    });

    dialog.addEventListener("close", () => dialog.remove(), { once: true });
    dialog.showModal();

    confirmButton.addEventListener("click", async () => {
        confirmButton.disabled = true;
        confirmButton.textContent = "Suppression…";
        message.textContent = "";

        const { data, error } = await supabaseClient.rpc("delete_artwork", {
            p_artwork_id: artwork.id
        });

        if (error) {
            console.error("Impossible de supprimer l’œuvre :", error);
            confirmButton.disabled = false;
            confirmButton.textContent = "Supprimer définitivement";
            message.textContent = "La suppression a échoué. Réessayez.";
            return;
        }

        const cleanup = Array.isArray(data) ? data[0] : data;

        if (cleanup?.storage_path) {
            const { error: storageError } = await supabaseClient.storage
                .from(CONFIG.ARTWORKS_BUCKET)
                .remove([cleanup.storage_path]);

            if (storageError) {
                console.error("La preview n'a pas pu être supprimée :", storageError);
                dialog.close();
                renderArtworkList(user, "L’œuvre a été supprimée. La suppression de sa preview devra être réessayée.");
                return;
            }

            const { error: uploadError } = await supabaseClient
                .from(CONFIG.UPLOADS_TABLE)
                .delete()
                .eq("id", cleanup.upload_id);

            if (uploadError) {
                console.error("La trace de la preview n'a pas pu être supprimée :", uploadError);
            }
        }

        dialog.close();
        renderArtworkList(user, "L’œuvre et sa preview ont été supprimées définitivement.");
    });
}

function createReplacementPreviewOption(upload) {
    const label = document.createElement("label");
    const input = document.createElement("input");
    const image = document.createElement("img");
    const details = document.createElement("span");
    const name = document.createElement("strong");
    const date = document.createElement("span");
    const publicUrl = supabaseClient.storage
        .from(CONFIG.ARTWORKS_BUCKET)
        .getPublicUrl(upload.storage_path)
        .data.publicUrl;

    label.className = "preview-choice";
    input.name = "replacement-upload-id";
    input.type = "radio";
    input.value = upload.id;
    image.alt = `Nouvelle preview : ${upload.original_name}`;
    image.loading = "lazy";
    image.src = publicUrl;
    details.className = "preview-choice-details";
    name.textContent = upload.original_name;
    date.textContent = upload.created_at ? `Envoyée le ${formatArtworkDate(upload.created_at)}` : "Preview en attente";

    input.addEventListener("change", () => {
        document.querySelectorAll(".preview-choice").forEach((choice) => choice.classList.remove("is-selected"));
        label.classList.add("is-selected");
    });

    details.append(name, date);
    label.append(input, image, details);

    return label;
}

async function loadReplacementPreviews() {
    const container = document.getElementById("replacement-previews");
    const { data, error } = await supabaseClient
        .from(CONFIG.UPLOADS_TABLE)
        .select("id, storage_path, original_name, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

    if (error || !data.length) {
        return;
    }

    data.forEach((upload) => container.append(createReplacementPreviewOption(upload)));
}

async function renderArtworkEditor(user, artworkId, successMessage = "") {
    renderStudioShell(user, "artworks", `
        <p class="eyebrow">ŒUVRE</p>
        <h1 class="display">Chargement…</h1>
    `);

    const { data: artwork, error } = await supabaseClient
        .from(CONFIG.ARTWORKS_TABLE)
        .select("id, title, location, year, description, format, price_digital, price_physical, image_url, is_published")
        .eq("id", artworkId)
        .single();

    if (error || !artwork) {
        console.error("Impossible de charger l’œuvre :", error);
        renderStudioShell(user, "artworks", `
            <p class="eyebrow">ŒUVRE</p>
            <h1 class="display">Œuvre introuvable</h1>
            <p class="dashboard-intro">Cette œuvre n’est plus disponible dans le catalogue.</p>
            <button class="btn btn-primary" id="back-to-artworks" type="button">Retour aux œuvres</button>
        `);
        document.getElementById("back-to-artworks").addEventListener("click", () => renderArtworkList(user));
        return;
    }

    const currentYear = new Date().getFullYear() + 1;

    renderStudioShell(user, "artworks", `
        <p class="eyebrow">MODIFIER L’ŒUVRE</p>
        <h1 class="display" id="editor-title"></h1>
        <form class="artwork-form" id="artwork-edit-form" novalidate>
            <div class="current-preview">
                <img id="current-artwork-image" alt="Preview actuelle de l’œuvre">
                <div>
                    <p class="eyebrow">PREVIEW ACTUELLE</p>
                    <p>Vous pouvez conserver cette image ou choisir une preview en attente plus bas.</p>
                </div>
            </div>
            <fieldset class="form-section">
                <legend class="display">Informations</legend>
                <div class="form-grid">
                    <label class="form-field form-field-wide">Titre
                        <input id="edit-artwork-title" type="text" maxlength="140" required>
                    </label>
                    <label class="form-field">Lieu
                        <input id="edit-artwork-location" type="text" maxlength="140">
                    </label>
                    <label class="form-field">Année
                        <input id="edit-artwork-year" type="number" min="1800" max="${currentYear}">
                    </label>
                    <label class="form-field form-field-wide">Description
                        <textarea id="edit-artwork-description" rows="5" maxlength="1200"></textarea>
                    </label>
                </div>
            </fieldset>
            <fieldset class="form-section">
                <legend class="display">Vente et publication</legend>
                <div class="form-grid">
                    <label class="form-field form-field-wide">Format de tirage
                        <input id="edit-artwork-format" type="text" maxlength="140">
                    </label>
                    <label class="form-field">Prix numérique (€)
                        <input id="edit-price-digital" type="number" min="0" step="0.01" inputmode="decimal">
                    </label>
                    <label class="form-field">Prix tirage (€)
                        <input id="edit-price-physical" type="number" min="0" step="0.01" inputmode="decimal">
                    </label>
                </div>
                <label class="publish-toggle" for="edit-is-published">
                    <input id="edit-is-published" type="checkbox">
                    <span>Œuvre visible dans la galerie</span>
                </label>
            </fieldset>
            <fieldset class="form-section">
                <legend class="display">Remplacer la preview</legend>
                <label class="keep-current-preview is-selected">
                    <input name="replacement-upload-id" type="radio" value="" checked>
                    <span>Conserver l’image actuelle</span>
                </label>
                <div class="preview-choices" id="replacement-previews"></div>
            </fieldset>
            <p class="form-message" id="edit-artwork-message" aria-live="polite"></p>
            <div class="editor-actions">
                <button class="btn" id="cancel-artwork-edit" type="button">Annuler</button>
                <button class="btn btn-primary" id="save-artwork-button" type="submit">Enregistrer les modifications</button>
            </div>
        </form>
    `);

    document.getElementById("editor-title").textContent = artwork.title || "Sans titre";
    document.getElementById("current-artwork-image").src = artwork.image_url || "";
    document.getElementById("edit-artwork-title").value = artwork.title || "";
    document.getElementById("edit-artwork-location").value = artwork.location || "";
    document.getElementById("edit-artwork-year").value = artwork.year || "";
    document.getElementById("edit-artwork-description").value = artwork.description || "";
    document.getElementById("edit-artwork-format").value = artwork.format || "";
    document.getElementById("edit-price-digital").value = artwork.price_digital ?? "";
    document.getElementById("edit-price-physical").value = artwork.price_physical ?? "";
    document.getElementById("edit-is-published").checked = artwork.is_published;

    if (successMessage) {
        const message = document.getElementById("edit-artwork-message");
        message.classList.add("is-success");
        message.textContent = successMessage;
    }

    loadReplacementPreviews();

    document.querySelector(".keep-current-preview input").addEventListener("change", () => {
        document.querySelectorAll(".preview-choice").forEach((choice) => choice.classList.remove("is-selected"));
    });

    document.getElementById("cancel-artwork-edit").addEventListener("click", () => renderArtworkList(user));

    document.getElementById("artwork-edit-form").addEventListener("submit", async (event) => {
        event.preventDefault();

        const title = document.getElementById("edit-artwork-title").value.trim();
        const yearValue = document.getElementById("edit-artwork-year").value;
        const digitalValue = document.getElementById("edit-price-digital").value;
        const physicalValue = document.getElementById("edit-price-physical").value;
        const replacement = document.querySelector('input[name="replacement-upload-id"]:checked');
        const button = document.getElementById("save-artwork-button");
        const message = document.getElementById("edit-artwork-message");

        if (!title) {
            message.textContent = "Le titre de l’œuvre est obligatoire.";
            return;
        }

        button.disabled = true;
        button.textContent = "Enregistrement…";
        message.classList.remove("is-success");
        message.textContent = "";

        const { error: updateError } = await supabaseClient.rpc("update_artwork", {
            p_artwork_id: artwork.id,
            p_title: title,
            p_slug: createSlug(title),
            p_location: document.getElementById("edit-artwork-location").value,
            p_year: yearValue ? Number(yearValue) : null,
            p_description: document.getElementById("edit-artwork-description").value,
            p_format: document.getElementById("edit-artwork-format").value,
            p_price_digital: digitalValue ? Number(digitalValue) : null,
            p_price_physical: physicalValue ? Number(physicalValue) : null,
            p_is_published: document.getElementById("edit-is-published").checked,
            p_replacement_upload_id: replacement?.value || null
        });

        if (updateError) {
            console.error("Impossible de modifier l’œuvre :", updateError);
            button.disabled = false;
            button.textContent = "Enregistrer les modifications";
            message.textContent = "Les modifications n’ont pas pu être enregistrées. Réessayez.";
            return;
        }

        renderArtworkEditor(user, artwork.id, "Les modifications ont été enregistrées.");
    });
}

function renderPreviewUpload(user) {
    renderStudioShell(user, "uploads", `
        <p class="eyebrow">NOUVEAU MÉDIA</p>
        <h1 class="display">Ajouter une preview</h1>
        <p class="dashboard-intro">Envoyez une image optimisée pour la galerie. Elle sera conservée en attente, puis associée à l’œuvre au Sprint 4.</p>
        <form class="upload-form" id="preview-upload-form" novalidate>
            <label class="upload-dropzone" for="preview-file">
                <span class="upload-dropzone-title display">Choisir une image</span>
                <span>JPEG, PNG ou WebP · 15 Mo maximum</span>
                <input id="preview-file" name="preview-file" type="file" accept="image/jpeg,image/png,image/webp" required>
            </label>
            <div class="upload-preview" id="upload-preview" hidden>
                <img id="preview-image" alt="Aperçu de l'image sélectionnée">
                <div>
                    <p class="eyebrow">FICHIER SÉLECTIONNÉ</p>
                    <p class="upload-file-name" id="preview-name"></p>
                    <p class="upload-file-meta" id="preview-meta"></p>
                </div>
            </div>
            <p class="form-message" id="upload-message" aria-live="polite"></p>
            <button class="btn btn-primary" id="upload-button" type="submit" disabled>Envoyer la preview</button>
        </form>
    `);

    bindPreviewUploadForm(user);
}

function bindPreviewUploadForm(user) {
    const form = document.getElementById("preview-upload-form");
    const input = document.getElementById("preview-file");
    const preview = document.getElementById("upload-preview");
    const image = document.getElementById("preview-image");
    const fileName = document.getElementById("preview-name");
    const fileMeta = document.getElementById("preview-meta");
    const message = document.getElementById("upload-message");
    const button = document.getElementById("upload-button");
    let selectedFile = null;
    let previewUrl = null;

    function clearPreview() {
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            previewUrl = null;
        }

        image.removeAttribute("src");
        preview.hidden = true;
    }

    function showMessage(text, isError = true) {
        message.classList.toggle("is-success", !isError);
        message.textContent = text;
    }

    input.addEventListener("change", () => {
        const file = input.files[0];

        clearPreview();
        selectedFile = null;
        button.disabled = true;
        showMessage("");

        if (!file) {
            return;
        }

        if (!CONFIG.PREVIEW_ALLOWED_TYPES.includes(file.type)) {
            showMessage("Choisissez une image JPEG, PNG ou WebP.");
            return;
        }

        if (file.size > CONFIG.PREVIEW_MAX_FILE_SIZE) {
            showMessage("La preview dépasse la limite de 15 Mo. Exportez une version plus légère.");
            return;
        }

        selectedFile = file;
        previewUrl = URL.createObjectURL(file);
        image.src = previewUrl;
        image.onload = () => {
            fileName.textContent = file.name;
            fileMeta.textContent = `${formatFileSize(file.size)} · ${image.naturalWidth} × ${image.naturalHeight} px`;
            preview.hidden = false;
            button.disabled = false;
        };
        image.onerror = () => {
            clearPreview();
            selectedFile = null;
            showMessage("Cette image ne peut pas être lue par le navigateur.");
        };
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (!selectedFile) {
            showMessage("Choisissez une image avant de l'envoyer.");
            return;
        }

        const extension = getFileExtension(selectedFile);
        const storagePath = createStorageFileName(extension);

        button.disabled = true;
        button.textContent = "Envoi en cours…";
        showMessage("", false);

        const { error: storageError } = await supabaseClient.storage
            .from(CONFIG.ARTWORKS_BUCKET)
            .upload(storagePath, selectedFile, {
                cacheControl: "31536000",
                contentType: selectedFile.type,
                upsert: false
            });

        if (storageError) {
            console.error("Impossible d'envoyer la preview :", storageError);
            button.disabled = false;
            button.textContent = "Envoyer la preview";
            showMessage("L'envoi a échoué. Vérifiez que la sécurité du Sprint 3 a bien été activée dans Supabase.");
            return;
        }

        const { error: databaseError } = await supabaseClient
            .from(CONFIG.UPLOADS_TABLE)
            .insert({
                storage_path: storagePath,
                original_name: selectedFile.name,
                mime_type: selectedFile.type,
                file_size_bytes: selectedFile.size,
                created_by: user.id
            });

        if (databaseError) {
            console.error("Impossible d'enregistrer la preview :", databaseError);
            await supabaseClient.storage.from(CONFIG.ARTWORKS_BUCKET).remove([storagePath]);
            button.disabled = false;
            button.textContent = "Envoyer la preview";
            showMessage("L'image n'a pas été enregistrée. Aucun fichier n'a été conservé.");
            return;
        }

        input.value = "";
        clearPreview();
        selectedFile = null;
        button.textContent = "Envoyer une autre preview";
        showMessage("Preview enregistrée. Vous pourrez maintenant l'associer à une œuvre au Sprint 4.", false);
    });
}

async function initStudio() {
    const user = await getCurrentUser();

    if (!user) {
        renderLogin();
        return;
    }

    const access = await isStudioAdmin(user.id);

    if (!access.allowed) {
        renderAccessDenied(access.setupRequired);
        return;
    }

    renderDashboard(user);
}

initStudio();
