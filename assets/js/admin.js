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
                    <button class="${activeView === "publication" ? "is-active" : ""}" data-view="publication" type="button" ${activeView === "publication" ? 'aria-current="page"' : ""}>Nouvelle publication</button>
                    <button class="${activeView === "artworks" ? "is-active" : ""}" data-view="artworks" type="button" ${activeView === "artworks" ? 'aria-current="page"' : ""}>Catalogue</button>
                    <button class="${activeView === "orders" ? "is-active" : ""}" data-view="orders" type="button" ${activeView === "orders" ? 'aria-current="page"' : ""}>Commandes</button>
                    <button class="${activeView === "accounting" ? "is-active" : ""}" data-view="accounting" type="button" ${activeView === "accounting" ? 'aria-current="page"' : ""}>Comptabilité</button>
                    <button class="${activeView === "collections" ? "is-active" : ""}" data-view="collections" type="button" ${activeView === "collections" ? 'aria-current="page"' : ""}>Collections</button>
                    <button class="${activeView === "instagram" ? "is-active" : ""}" data-view="instagram" type="button" ${activeView === "instagram" ? 'aria-current="page"' : ""}>Instagram</button>
                    <button class="${activeView === "alerts" ? "is-active" : ""}" data-view="alerts" type="button" ${activeView === "alerts" ? 'aria-current="page"' : ""}>Alertes</button>
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

            if (button.dataset.view === "publication") {
                renderPublicationComposer(user);
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

            if (button.dataset.view === "collections") {
                renderCollectionList(user);
                return;
            }

            if (button.dataset.view === "instagram") {
                renderInstagram(user);
                return;
            }

            if (button.dataset.view === "alerts") {
                renderTelegramAlerts(user);
                return;
            }

            renderPublicationComposer(user);
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

function escapeHtmlAttribute(value) {
    return String(value || "").replace(/[&<>"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    }[character]));
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

/* ============================================================
   Publication unifiée

   L'envoi de preview et la création de l'œuvre restent deux opérations
   techniques distinctes dans Supabase, mais ne forment plus deux étapes
   visibles pour Valentin. Cette vue les enchaîne de manière atomique.
   ============================================================ */

function titleFromFileName(fileName) {
    return fileName
        .replace(/\.[^.]+$/, "")
        .replace(/[-_]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 140) || "Sans titre";
}

async function uploadPublicationPreview(file, user) {
    const extension = getFileExtension(file);
    const storagePath = createStorageFileName(extension);
    const { error: storageError } = await supabaseClient.storage
        .from(CONFIG.ARTWORKS_BUCKET)
        .upload(storagePath, file, {
            cacheControl: "31536000",
            contentType: file.type,
            upsert: false
        });

    if (storageError) throw new Error("L’envoi de l’image a échoué.");

    const { data: upload, error: databaseError } = await supabaseClient
        .from(CONFIG.UPLOADS_TABLE)
        .insert({
            storage_path: storagePath,
            original_name: file.name,
            mime_type: file.type,
            file_size_bytes: file.size,
            created_by: user.id
        })
        .select("id")
        .single();

    if (databaseError || !upload?.id) {
        await supabaseClient.storage.from(CONFIG.ARTWORKS_BUCKET).remove([storagePath]);
        throw new Error("L’image n’a pas pu être enregistrée dans le Studio.");
    }

    return upload.id;
}

async function createPublishedArtwork(uploadId, values) {
    const { data: artworkId, error } = await supabaseClient.rpc("create_artwork_from_upload", {
        p_upload_id: uploadId,
        p_title: values.title,
        p_slug: createSlug(values.title),
        p_location: values.location,
        p_year: values.year,
        p_description: values.description,
        p_format: values.format,
        p_price_digital: values.priceDigital,
        p_price_physical: values.pricePhysical,
        p_is_published: values.isPublished
    });

    if (error || !artworkId) throw new Error("L’œuvre n’a pas pu être créée.");
    return artworkId;
}

function renderPublicationImageInputs(files, container) {
    container.replaceChildren();
    Array.from(files).forEach((file, index) => {
        const card = document.createElement("article");
        const image = document.createElement("img");
        const details = document.createElement("div");
        const titleLabel = document.createElement("label");
        const titleInput = document.createElement("input");
        const name = document.createElement("p");
        const url = URL.createObjectURL(file);

        card.className = "publication-image";
        image.src = url;
        image.alt = `Aperçu ${index + 1}`;
        image.onload = () => URL.revokeObjectURL(url);
        titleLabel.textContent = `Titre de l’image ${index + 1}`;
        titleInput.name = "image-title";
        titleInput.maxLength = 140;
        titleInput.required = true;
        titleInput.value = titleFromFileName(file.name);
        name.className = "instagram-note";
        name.textContent = file.name;
        details.append(titleLabel, titleInput, name);
        card.append(image, details);
        container.append(card);
    });
}

function renderPublicationComposer(user, successMessage = "") {
    const currentYear = new Date().getFullYear() + 1;

    renderStudioShell(user, "publication", `
        <p class="eyebrow">PUBLICATION</p>
        <h1 class="display">Nouvelle publication</h1>
        <p class="dashboard-intro">Choisis tes images, renseigne les informations, puis publie. Le Studio prépare automatiquement les previews et les œuvres.</p>
        <form class="artwork-form" id="publication-form" novalidate>
            <div class="publication-type" role="radiogroup" aria-label="Type de publication">
                <label><input type="radio" name="publication-type" value="single" checked><span>Une œuvre</span></label>
                <label><input type="radio" name="publication-type" value="carousel"><span>Un carrousel</span></label>
            </div>
            <fieldset class="form-section">
                <legend class="display">1. Images</legend>
                <label class="upload-dropzone" for="publication-files">
                    <span class="upload-dropzone-title display">Choisir une image</span>
                    <span id="publication-file-help">JPEG, PNG ou WebP · 15 Mo maximum</span>
                    <input id="publication-files" name="publication-files" type="file" accept="image/jpeg,image/png,image/webp" required>
                </label>
                <div class="publication-images" id="publication-images"></div>
            </fieldset>
            <fieldset class="form-section">
                <legend class="display">2. Présentation</legend>
                <div class="form-grid">
                    <label class="form-field form-field-wide"><span id="publication-title-label">Titre</span>
                        <input id="publication-title" name="title" type="text" maxlength="140" required>
                    </label>
                    <label class="form-field">Lieu
                        <input id="publication-location" name="location" type="text" maxlength="140" placeholder="Amiens, France">
                    </label>
                    <label class="form-field">Année
                        <input id="publication-year" name="year" type="number" min="1800" max="${currentYear}" placeholder="2026">
                    </label>
                    <label class="form-field form-field-wide">Description
                        <textarea id="publication-description" name="description" rows="5" maxlength="1200"></textarea>
                    </label>
                </div>
            </fieldset>
            <fieldset class="form-section">
                <legend class="display">3. Vente et publication</legend>
                <div class="form-grid">
                    <label class="form-field form-field-wide">Format de tirage
                        <input id="publication-format" name="format" type="text" maxlength="140" placeholder="Ex. Tirage fine art · 30 × 40 cm">
                    </label>
                    <label class="form-field">Prix numérique par image (€)
                        <input id="publication-price-digital" name="price-digital" type="number" min="0" step="0.01" inputmode="decimal" placeholder="18">
                    </label>
                    <label class="form-field">Prix tirage par image (€)
                        <input id="publication-price-physical" name="price-physical" type="number" min="0" step="0.01" inputmode="decimal" placeholder="35">
                    </label>
                    <label class="form-field form-field-wide" id="collection-price-field" hidden>Prix du pack numérique (€)
                        <input id="publication-pack-price" name="pack-price" type="number" min="0" step="0.01" inputmode="decimal" placeholder="Ex. 60">
                    </label>
                </div>
                <label class="publish-toggle"><input id="publication-publish-artworks" name="publish-artworks" type="checkbox" checked><span id="publication-publish-artworks-label">Publier l’œuvre dans la galerie</span></label>
                <label class="publish-toggle" id="collection-publish-toggle" hidden><input id="publication-publish-collection" name="publish-collection" type="checkbox" checked><span>Publier le carrousel dans la galerie</span></label>
            </fieldset>
            <p class="form-message" id="publication-message" aria-live="polite"></p>
            <button class="btn btn-primary" id="publication-submit" type="submit">Publier l’œuvre</button>
        </form>
    `);

    const form = document.getElementById("publication-form");
    const filesInput = document.getElementById("publication-files");
    const filesContainer = document.getElementById("publication-images");
    const message = document.getElementById("publication-message");
    const submit = document.getElementById("publication-submit");
    const typeInputs = form.querySelectorAll('input[name="publication-type"]');
    let selectedFiles = [];

    const updateMode = () => {
        const isCarousel = form.querySelector('input[name="publication-type"]:checked').value === "carousel";
        filesInput.multiple = isCarousel;
        document.querySelector(".upload-dropzone-title").textContent = isCarousel ? "Choisir les images" : "Choisir une image";
        document.getElementById("publication-file-help").textContent = isCarousel ? "Au moins 2 images · JPEG, PNG ou WebP · 15 Mo maximum par image" : "JPEG, PNG ou WebP · 15 Mo maximum";
        document.getElementById("publication-title-label").textContent = isCarousel ? "Titre de la collection" : "Titre";
        document.getElementById("collection-price-field").hidden = !isCarousel;
        document.getElementById("collection-publish-toggle").hidden = !isCarousel;
        document.getElementById("publication-publish-artworks-label").textContent = isCarousel ? "Afficher aussi chaque image séparément dans la galerie" : "Publier l’œuvre dans la galerie";
        form["publish-artworks"].checked = !isCarousel;
        submit.textContent = isCarousel ? "Créer le carrousel" : "Publier l’œuvre";
        selectedFiles = [];
        filesInput.value = "";
        filesContainer.replaceChildren();
        message.textContent = "";
    };

    typeInputs.forEach((input) => input.addEventListener("change", updateMode));

    filesInput.addEventListener("change", () => {
        const isCarousel = form.querySelector('input[name="publication-type"]:checked').value === "carousel";
        const files = Array.from(filesInput.files || []);
        if (!files.length) return;
        if ((!isCarousel && files.length !== 1) || (isCarousel && files.length < 2)) {
            message.textContent = isCarousel ? "Choisis au moins deux images pour créer un carrousel." : "Choisis une seule image.";
            selectedFiles = [];
            filesInput.value = "";
            filesContainer.replaceChildren();
            return;
        }
        const invalidFile = files.find((file) => !CONFIG.PREVIEW_ALLOWED_TYPES.includes(file.type) || file.size > CONFIG.PREVIEW_MAX_FILE_SIZE);
        if (invalidFile) {
            message.textContent = "Chaque image doit être en JPEG, PNG ou WebP et faire moins de 15 Mo.";
            selectedFiles = [];
            filesInput.value = "";
            filesContainer.replaceChildren();
            return;
        }
        selectedFiles = files;
        message.textContent = "";
        renderPublicationImageInputs(files, filesContainer);
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const isCarousel = form.querySelector('input[name="publication-type"]:checked').value === "carousel";
        const title = document.getElementById("publication-title").value.trim();
        const imageTitles = Array.from(form.querySelectorAll('input[name="image-title"]')).map((input) => input.value.trim());

        if (!selectedFiles.length || !title || imageTitles.some((imageTitle) => !imageTitle)) {
            message.textContent = "Choisis les images et renseigne tous les titres avant de publier.";
            return;
        }
        if (isCarousel && selectedFiles.length < 2) {
            message.textContent = "Un carrousel nécessite au moins deux images.";
            return;
        }

        const year = form.year.value ? Number(form.year.value) : null;
        const sharedValues = {
            location: form.location.value.trim(),
            year,
            description: form.description.value.trim(),
            format: form.format.value.trim(),
            priceDigital: form["price-digital"].value ? Number(form["price-digital"].value) : null,
            pricePhysical: form["price-physical"].value ? Number(form["price-physical"].value) : null,
            isPublished: form["publish-artworks"].checked
        };

        submit.disabled = true;
        submit.textContent = "Publication en cours…";
        message.classList.remove("is-success");
        message.textContent = "Préparation des images…";

        try {
            const artworkIds = [];
            for (let index = 0; index < selectedFiles.length; index += 1) {
                message.textContent = `Envoi de l’image ${index + 1} sur ${selectedFiles.length}…`;
                const uploadId = await uploadPublicationPreview(selectedFiles[index], user);
                const artworkId = await createPublishedArtwork(uploadId, { ...sharedValues, title: isCarousel ? imageTitles[index] : title });
                artworkIds.push(artworkId);
            }

            if (isCarousel) {
                message.textContent = "Création du carrousel…";
                const { error } = await supabaseClient.rpc("save_collection", {
                    p_collection_id: null,
                    p_title: title,
                    p_slug: createSlug(title),
                    p_description: sharedValues.description,
                    p_price_digital_pack: form["pack-price"].value ? Number(form["pack-price"].value) : null,
                    p_is_published: form["publish-collection"].checked,
                    p_show_items_on_home: false,
                    p_artwork_ids: artworkIds
                });
                if (error) throw new Error("Le carrousel n’a pas pu être créé.");
            }

            renderPublicationComposer(user, isCarousel ? "Le carrousel et ses œuvres ont été créés." : "L’œuvre a été créée.");
        } catch (error) {
            console.error("Impossible de créer la publication :", error);
            submit.disabled = false;
            submit.textContent = isCarousel ? "Créer le carrousel" : "Publier l’œuvre";
            message.textContent = `${error.message || "La publication n’a pas pu être créée."} Les images déjà envoyées restent en brouillon dans le Studio.`;
        }
    });

    if (successMessage) {
        message.classList.add("is-success");
        message.textContent = successMessage;
    }
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
    const publishedContainer = document.getElementById("published-artwork-list");
    const draftContainer = document.getElementById("draft-artwork-list");
    const publishedCount = document.getElementById("published-artwork-count");
    const draftCount = document.getElementById("draft-artwork-count");
    const status = document.getElementById("artwork-list-status");
    const cleanedPreviews = await retryOrphanedPreviewCleanup();
    const { data, error } = await supabaseClient
        .from(CONFIG.ARTWORKS_TABLE)
        .select("id, title, location, year, image_url, is_published, created_at")
        .order("created_at", { ascending: false });

    publishedContainer.replaceChildren();
    draftContainer.replaceChildren();

    if (error) {
        console.error("Impossible de charger les œuvres :", error);
        status.textContent = "Les œuvres sont momentanément indisponibles.";
        return;
    }

    if (!data.length) {
        publishedCount.textContent = "0 œuvre";
        draftCount.textContent = "0 brouillon";
        publishedContainer.innerHTML = '<p class="empty-state">Aucune œuvre publiée pour le moment.</p>';
        draftContainer.innerHTML = '<p class="empty-state">Aucun brouillon pour le moment.</p>';
        return;
    }

    if (cleanedPreviews) {
        status.classList.add("is-success");
        status.textContent = "Une preview résiduelle a été nettoyée automatiquement.";
    }

    const publishedArtworks = data.filter((artwork) => artwork.is_published);
    const draftArtworks = data.filter((artwork) => !artwork.is_published);

    publishedCount.textContent = `${publishedArtworks.length} œuvre${publishedArtworks.length > 1 ? "s" : ""}`;
    draftCount.textContent = `${draftArtworks.length} brouillon${draftArtworks.length > 1 ? "s" : ""}`;

    if (publishedArtworks.length) {
        publishedArtworks.forEach((artwork) => publishedContainer.append(createArtworkListItem(artwork, user)));
    } else {
        publishedContainer.innerHTML = '<p class="empty-state">Aucune œuvre publiée pour le moment.</p>';
    }

    if (draftArtworks.length) {
        draftArtworks.forEach((artwork) => draftContainer.append(createArtworkListItem(artwork, user)));
    } else {
        draftContainer.innerHTML = '<p class="empty-state">Aucun brouillon pour le moment.</p>';
    }
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
        <section class="catalogue-section" aria-labelledby="published-artworks-heading">
            <div class="catalogue-section-heading">
                <h2 class="display" id="published-artworks-heading">Publiées</h2>
                <p id="published-artwork-count">Chargement…</p>
            </div>
            <div class="studio-artwork-list" id="published-artwork-list" aria-label="Œuvres publiées"></div>
        </section>
        <section class="catalogue-section" aria-labelledby="draft-artworks-heading">
            <div class="catalogue-section-heading">
                <h2 class="display" id="draft-artworks-heading">Brouillons</h2>
                <p id="draft-artwork-count">Chargement…</p>
            </div>
            <div class="studio-artwork-list" id="draft-artwork-list" aria-label="Œuvres en brouillon"></div>
        </section>
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

    const [digitalResult, printResult, localResult, collectionResult] = await Promise.all([
        supabaseClient.from("digital_orders").select("buyer_email, amount, currency, status, paypal_environment, created_at, Artworks(title)").order("created_at", { ascending: false }),
        supabaseClient.from("print_orders").select("buyer_email, amount, currency, status, paypal_environment, created_at, shipping_address, shipping_zone, shipping_amount, Artworks(title)").order("created_at", { ascending: false }),
        supabaseClient.from("local_delivery_requests").select("id, buyer_name, buyer_email, buyer_phone, address_line, postal_code, city, payment_preference, payment_method, status, created_at, Artworks(title)").order("created_at", { ascending: false }),
        supabaseClient.from("collection_orders").select("buyer_email, amount, currency, status, paypal_environment, created_at, Collections(title)").order("created_at", { ascending: false })
    ]);

    renderLocalDeliveryRequests(user, localResult.data || [], localResult.error);

    if (digitalResult.error && printResult.error) {
        list.textContent = "Les commandes sont indisponibles.";
        return;
    }

    const orders = [
        ...(digitalResult.data || []).map((order) => ({ ...order, type: "numérique" })),
        ...(printResult.data || []).map((order) => ({ ...order, type: "tirage" })),
        ...(collectionResult.data || []).map((order) => ({ ...order, type: "pack" }))
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
        const orderLabel = order.type === "tirage" ? "Tirage physique" : order.type === "pack" ? "Pack numérique" : "Fichier numérique";
        details.textContent = `${orderLabel} · ${order.Artworks?.title || order.Collections?.title || "Œuvre"} · ${order.amount} ${order.currency} · ${order.buyer_email || "Email indisponible"} · ${formatArtworkDate(order.created_at)}`;
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

function createCollectionArtworkChoice(artwork, selectedIds) {
    const label = document.createElement("label");
    const input = document.createElement("input");
    const image = document.createElement("img");
    const details = document.createElement("span");
    const title = document.createElement("strong");

    label.className = "preview-choice";
    input.type = "checkbox";
    input.name = "collection-artwork-id";
    input.value = artwork.id;
    input.checked = selectedIds.includes(artwork.id);
    image.src = artwork.image_url || "";
    image.alt = artwork.title || "Œuvre sans titre";
    image.loading = "lazy";
    title.textContent = artwork.title || "Sans titre";
    details.append(title);
    label.append(input, image, details);
    label.classList.toggle("is-selected", input.checked);
    input.addEventListener("change", () => label.classList.toggle("is-selected", input.checked));
    return label;
}

async function loadCollectionArtworkChoices(selectedIds = []) {
    const container = document.getElementById("collection-artwork-choices");
    const { data, error } = await supabaseClient
        .from(CONFIG.ARTWORKS_TABLE)
        .select("id, title, image_url")
        .order("created_at", { ascending: false });

    if (error) {
        container.textContent = "Les œuvres sont indisponibles.";
        return;
    }

    // Les images déjà sélectionnées restent en tête, dans l’ordre du
    // carrousel. Les nouvelles sélections se placent ensuite à la fin.
    const orderedArtworks = [...(data || [])].sort((first, second) => {
        const firstIndex = selectedIds.indexOf(first.id);
        const secondIndex = selectedIds.indexOf(second.id);
        if (firstIndex === -1 && secondIndex === -1) return 0;
        if (firstIndex === -1) return 1;
        if (secondIndex === -1) return -1;
        return firstIndex - secondIndex;
    });

    container.replaceChildren();
    orderedArtworks.forEach((artwork) => container.append(createCollectionArtworkChoice(artwork, selectedIds)));
}

function renderCollectionEditor(user, collection = null) {
    const selectedIds = (collection?.collection_items || []).sort((a, b) => a.position - b.position).map((item) => item.artwork_id);
    const isEditing = Boolean(collection);

    renderStudioShell(user, "collections", `
        <p class="eyebrow">${isEditing ? "MODIFIER LA COLLECTION" : "NOUVELLE COLLECTION"}</p>
        <h1 class="display">${isEditing ? "Collection" : "Créer une collection"}</h1>
        <p class="dashboard-intro">Une collection présente une série comme un carrousel et peut proposer un pack numérique. Les œuvres restent achetables individuellement.</p>
        <form class="artwork-form" id="collection-form" novalidate>
            <fieldset class="form-section"><legend class="display">1. Présentation</legend><div class="form-grid">
                <label class="form-field form-field-wide">Titre<input name="title" maxlength="140" required value="${escapeHtmlAttribute(collection?.title)}"></label>
                <label class="form-field form-field-wide">Description<input name="description" maxlength="1200" value="${escapeHtmlAttribute(collection?.description)}"></label>
                <label class="form-field">Prix du pack numérique (€)<input name="pack-price" type="number" min="0" step="0.01" inputmode="decimal" value="${collection?.price_digital_pack ?? ""}" placeholder="Ex. 60"></label>
            </div></fieldset>
            <fieldset class="form-section"><legend class="display">Traductions</legend><p class="dashboard-intro">Optionnel. Les visiteurs verront le français tant que ces champs sont vides.</p><div class="form-grid">
                <label class="form-field form-field-wide">Titre anglais<input name="title-en" maxlength="140" value="${escapeHtmlAttribute(collection?.title_en)}"></label>
                <label class="form-field form-field-wide">Titre espagnol<input name="title-es" maxlength="140" value="${escapeHtmlAttribute(collection?.title_es)}"></label>
                <label class="form-field form-field-wide">Description anglaise<textarea name="description-en" rows="4" maxlength="1200">${escapeHtmlAttribute(collection?.description_en)}</textarea></label>
                <label class="form-field form-field-wide">Description espagnole<textarea name="description-es" rows="4" maxlength="1200">${escapeHtmlAttribute(collection?.description_es)}</textarea></label>
            </div></fieldset>
            <fieldset class="form-section"><legend class="display">2. Images du carrousel</legend><p class="dashboard-intro">Sélectionnez au moins deux œuvres. Leur ordre suit l’ordre d’affichage ci-dessous ; pour une importation Instagram, il sera conservé automatiquement.</p><div class="preview-choices" id="collection-artwork-choices"></div></fieldset>
            <label class="publish-toggle"><input name="published" type="checkbox" ${collection?.is_published ? "checked" : ""}><span>Publier la collection</span></label>
            <label class="publish-toggle"><input name="show-items" type="checkbox" ${collection?.show_items_on_home ? "checked" : ""}><span>Afficher aussi ses œuvres séparément sur l’accueil</span></label>
            <p class="form-message" id="collection-message" aria-live="polite"></p>
            <div class="editor-actions"><button class="btn" id="collection-cancel" type="button">Annuler</button><button class="btn btn-primary" id="collection-save" type="submit">${isEditing ? "Enregistrer" : "Créer la collection"}</button></div>
        </form>
    `);

    loadCollectionArtworkChoices(selectedIds);
    document.getElementById("collection-cancel").addEventListener("click", () => renderCollectionList(user));
    document.getElementById("collection-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const message = document.getElementById("collection-message");
        const button = document.getElementById("collection-save");
        const artworkIds = Array.from(form.querySelectorAll('input[name="collection-artwork-id"]:checked')).map((input) => input.value);
        if (artworkIds.length < 2) { message.textContent = "Choisissez au moins deux œuvres pour former le carrousel."; return; }
        button.disabled = true;
        button.textContent = "Enregistrement…";
        const { error } = await supabaseClient.rpc("save_collection", {
            p_collection_id: collection?.id || null,
            p_title: form.title.value.trim(),
            p_slug: createSlug(form.title.value),
            p_description: form.description.value.trim(),
            p_price_digital_pack: form["pack-price"].value ? Number(form["pack-price"].value) : null,
            p_is_published: form.published.checked,
            p_show_items_on_home: form["show-items"].checked,
            p_artwork_ids: artworkIds
        });
        if (error) { console.error("Impossible d’enregistrer la collection :", error); message.textContent = "La collection n’a pas pu être enregistrée."; button.disabled = false; button.textContent = isEditing ? "Enregistrer" : "Créer la collection"; return; }
        if (isEditing) {
            const { error: translationError } = await supabaseClient.from("collections").update({
                title_en: form["title-en"].value.trim() || null,
                title_es: form["title-es"].value.trim() || null,
                description_en: form["description-en"].value.trim() || null,
                description_es: form["description-es"].value.trim() || null
            }).eq("id", collection.id);
            if (translationError) { console.error("Impossible d’enregistrer les traductions de la collection :", translationError); message.textContent = "La collection est enregistrée, mais pas ses traductions."; button.disabled = false; button.textContent = "Enregistrer"; return; }
        }
        renderCollectionList(user, isEditing ? "La collection a été mise à jour." : "La collection a été créée.");
    });
}

function createCollectionListItem(collection, user) {
    const article = document.createElement("article");
    const details = document.createElement("div");
    const title = document.createElement("h3");
    const metadata = document.createElement("p");
    const status = document.createElement("span");
    const actions = document.createElement("div");
    const edit = document.createElement("button");
    const remove = document.createElement("button");

    article.className = "studio-order-item";
    title.className = "display";
    title.textContent = collection.title;
    metadata.className = "studio-order-delivery";
    metadata.textContent = `${collection.collection_items?.length || 0} œuvres · ${collection.price_digital_pack ? `pack numérique ${formatAccountingAmount(collection.price_digital_pack)}` : "pas de pack numérique"}`;
    status.className = collection.is_published ? "artwork-status is-published" : "artwork-status";
    status.textContent = collection.is_published ? "Publiée" : "Brouillon";
    edit.className = "btn artwork-edit-button";
    edit.textContent = "Modifier";
    edit.type = "button";
    edit.addEventListener("click", () => renderCollectionEditor(user, collection));
    remove.className = "btn artwork-delete-button";
    remove.textContent = "Supprimer";
    remove.type = "button";
    remove.addEventListener("click", async () => {
        if (!window.confirm(`Supprimer la collection « ${collection.title} » ? Les œuvres seront conservées.`)) return;
        const { error } = await supabaseClient.rpc("delete_collection", { p_collection_id: collection.id });
        if (error) { alert("La collection n’a pas pu être supprimée."); return; }
        renderCollectionList(user, "La collection a été supprimée. Les œuvres sont conservées.");
    });
    details.append(title, metadata, status);
    actions.className = "artwork-item-actions";
    actions.append(edit, remove);
    article.append(details, actions);
    return article;
}

async function renderCollectionList(user, successMessage = "") {
    renderStudioShell(user, "collections", '<p class="eyebrow">SÉRIES</p><h1 class="display">Collections</h1><p class="dashboard-intro">Les carrousels se créent depuis « Nouvelle publication ». Ici, vous pouvez les modifier, les publier ou les supprimer.</p><p class="form-message" id="collection-list-message" aria-live="polite"></p><section class="studio-artwork-list" id="collection-list"></section>');
    const message = document.getElementById("collection-list-message");
    if (successMessage) { message.classList.add("is-success"); message.textContent = successMessage; }
    const list = document.getElementById("collection-list");
    const { data, error } = await supabaseClient.from("collections").select("id, title, title_en, title_es, description, description_en, description_es, price_digital_pack, is_published, show_items_on_home, collection_items(artwork_id, position)").order("created_at", { ascending: false });
    if (error) { list.textContent = "Les collections seront disponibles après l’activation de la fonctionnalité."; return; }
    if (!data?.length) { list.innerHTML = '<p class="empty-state">Aucune collection pour le moment.</p>'; return; }
    data.forEach((collection) => list.append(createCollectionListItem(collection, user)));
}

/* ============================================================
   Instagram

   Le navigateur n'obtient jamais de jeton Meta. Il transmet seulement la
   session Supabase courante aux fonctions Netlify, qui vérifient le droit
   d'administration du Studio avant chaque opération.
   ============================================================ */

async function studioRequest(endpoint, method = "GET", body = null) {
    const { data, error } = await supabaseClient.auth.getSession();
    const accessToken = data?.session?.access_token;
    if (error || !accessToken) throw new Error("Votre session Studio a expiré. Reconnectez-vous.");

    const response = await fetch(endpoint, {
        method,
        headers: {
            Authorization: `Bearer ${accessToken}`,
            ...(body ? { "Content-Type": "application/json" } : {})
        },
        ...(body ? { body: JSON.stringify(body) } : {})
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || `Le service a renvoyé une erreur (${response.status}).`);
    return payload;
}

function formatInstagramSyncDate(value) {
    if (!value) return "Jamais synchronisé";
    return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function renderTelegramAlerts(user) {
    renderStudioShell(user, "alerts", `
        <p class="eyebrow">SURVEILLANCE</p>
        <h1 class="display">Alertes Telegram</h1>
        <section class="instagram-panel">
            <h2 class="display">Valleblond Monitor</h2>
            <p class="dashboard-intro">Le bot te prévient immédiatement lors d’une vente numérique, d’une commande de tirage ou d’une demande de livraison locale. Les alertes Telegram ne bloquent jamais un paiement.</p>
            <button class="btn btn-primary" id="telegram-test" type="button">Tester le bot Telegram</button>
            <p class="form-message" id="telegram-message" aria-live="polite"></p>
        </section>
    `);

    const button = document.getElementById("telegram-test");
    const message = document.getElementById("telegram-message");
    button.addEventListener("click", async () => {
        button.disabled = true;
        button.textContent = "Envoi…";
        message.classList.remove("is-success");
        message.textContent = "";
        try {
            await studioRequest("/.netlify/functions/telegram-test", "POST");
            message.classList.add("is-success");
            message.textContent = "Test envoyé. Ouvre Telegram puis appuie sur « Tester le bot NAS ».";
        } catch (error) {
            message.textContent = error.message || "Le message de test n’a pas pu être envoyé.";
        } finally {
            button.disabled = false;
            button.textContent = "Tester le bot Telegram";
        }
    });
}

function renderInstagram(user) {
    renderStudioShell(user, "instagram", `
        <p class="eyebrow">PUBLICATION</p>
        <h1 class="display">Instagram</h1>
        <p class="dashboard-intro">Les publications photo arrivent dans le Studio comme brouillons. Les Reels sont ignorés. Un carrousel devient une collection, avec ses œuvres indépendantes dans le bon ordre.</p>
        <section class="instagram-panel" id="instagram-panel" aria-live="polite">
            <p class="dashboard-intro">Vérification de la connexion Instagram…</p>
        </section>
    `);

    const panel = document.getElementById("instagram-panel");

    const renderDisconnected = (message = "") => {
        panel.replaceChildren();
        const title = document.createElement("h2");
        const text = document.createElement("p");
        const note = document.createElement("p");
        const connect = document.createElement("button");
        const feedback = document.createElement("p");

        title.className = "display";
        title.textContent = "Connecter Instagram";
        text.className = "dashboard-intro";
        text.textContent = "Autorise une seule fois Facebook à relier la Page associée à ton compte Instagram professionnel. Aucun mot de passe ni jeton ne passe par le Studio.";
        note.className = "instagram-note";
        note.textContent = "Après la connexion, tu pourras importer les 25 dernières publications photo en un clic.";
        connect.className = "btn btn-primary";
        connect.type = "button";
        connect.textContent = "Connecter Instagram";
        feedback.className = "form-message";
        if (message) feedback.textContent = message;

        connect.addEventListener("click", async () => {
            connect.disabled = true;
            connect.textContent = "Ouverture d’Instagram…";
            feedback.textContent = "";
            // Ouvre immédiatement la fenêtre : les navigateurs bloquent souvent
            // une popup déclenchée seulement après une requête asynchrone.
            const popup = window.open("", "valleblond-instagram", "popup=yes,width=580,height=760");
            if (!popup) {
                feedback.textContent = "Autorisez l’ouverture de la fenêtre Instagram, puis recommencez.";
                connect.disabled = false;
                connect.textContent = "Connecter Instagram";
                return;
            }
            try {
                const { authorizationUrl } = await studioRequest("/.netlify/functions/instagram-start", "POST");
                popup.location.assign(authorizationUrl);
                feedback.classList.add("is-success");
                feedback.textContent = "La fenêtre Instagram est ouverte. Autorise l’accès, puis reviens ici.";
                connect.disabled = false;
                connect.textContent = "Ouvrir à nouveau";
            } catch (error) {
                popup.close();
                feedback.textContent = error.message;
                connect.disabled = false;
                connect.textContent = "Connecter Instagram";
            }
        });

        panel.append(title, text, note, connect, feedback);
    };

    const renderConnected = (connection) => {
        panel.replaceChildren();
        const title = document.createElement("h2");
        const text = document.createElement("p");
        const note = document.createElement("p");
        const actions = document.createElement("div");
        const sync = document.createElement("button");
        const disconnect = document.createElement("button");
        const feedback = document.createElement("p");

        title.className = "display";
        title.textContent = `@${connection.instagram_username || "Instagram"} est connecté`;
        text.className = "dashboard-intro";
        text.textContent = "Le compte Instagram professionnel est autorisé de manière sécurisée.";
        note.className = "instagram-note";
        note.textContent = `Dernière synchronisation : ${formatInstagramSyncDate(connection.last_sync_at)}. Les importations ne publient jamais automatiquement une œuvre.`;
        actions.className = "editor-actions";
        sync.className = "btn btn-primary";
        sync.type = "button";
        sync.textContent = "Synchroniser les publications";
        disconnect.className = "btn";
        disconnect.type = "button";
        disconnect.textContent = "Déconnecter";
        feedback.className = "form-message";

        sync.addEventListener("click", async () => {
            sync.disabled = true;
            disconnect.disabled = true;
            sync.textContent = "Synchronisation…";
            feedback.textContent = "";
            try {
                const result = await studioRequest("/.netlify/functions/instagram-sync", "POST");
                const total = result.artworks + result.collections;
                feedback.classList.add("is-success");
                feedback.textContent = `${result.artworks} œuvre${result.artworks > 1 ? "s" : ""} et ${result.collections} collection${result.collections > 1 ? "s" : ""} importée${total > 1 ? "s" : ""} en brouillon. ${result.reels ? `${result.reels} Reel${result.reels > 1 ? "s" : ""} ignoré${result.reels > 1 ? "s" : ""}. ` : ""}${result.alreadyImported ? `${result.alreadyImported} élément${result.alreadyImported > 1 ? "s déjà importés" : " déjà importé"}. ` : ""}${result.errors?.length ? "Certaines images n’ont pas pu être importées : réessaie dans quelques minutes." : ""}`;
                sync.textContent = "Synchroniser à nouveau";
            } catch (error) {
                feedback.textContent = error.message;
                sync.textContent = "Synchroniser les publications";
            } finally {
                sync.disabled = false;
                disconnect.disabled = false;
            }
        });

        disconnect.addEventListener("click", async () => {
            if (!window.confirm("Déconnecter Instagram ? Les œuvres déjà importées seront conservées.")) return;
            disconnect.disabled = true;
            try {
                await studioRequest("/.netlify/functions/instagram-disconnect", "POST");
                renderDisconnected("Instagram est déconnecté. Les œuvres importées restent dans le Studio.");
            } catch (error) {
                feedback.textContent = error.message;
                disconnect.disabled = false;
            }
        });

        actions.append(sync, disconnect);
        panel.append(title, text, note, actions, feedback);
    };

    const onInstagramConnection = (event) => {
        if (event.origin !== window.location.origin || event.data?.type !== "valleblond-instagram") return;
        if (event.data.success) renderInstagram(user);
    };
    window.addEventListener("message", onInstagramConnection, { once: true });

    studioRequest("/.netlify/functions/instagram-status")
        .then(({ connected, connection }) => connected ? renderConnected(connection) : renderDisconnected())
        .catch((error) => renderDisconnected(error.message));
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
    const [digitalResult, printResult, localResult, collectionResult] = await Promise.all([
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
            .order("paid_at", { ascending: false }),
        supabaseClient
            .from("collection_orders")
            .select("id, paypal_capture_id, buyer_email, amount, currency, completed_at, Collections(title)")
            .eq("status", "completed")
            .eq("paypal_environment", "live")
            .order("completed_at", { ascending: false })
    ]);

    if (digitalResult.error || printResult.error || localResult.error || collectionResult.error) {
        console.error("Impossible de charger le registre comptable :", {
            digital: digitalResult.error,
            print: printResult.error,
            local: localResult.error,
            collection: collectionResult.error
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
        })),
        ...(collectionResult.data || []).map((order) => ({
            date: order.completed_at,
            reference: order.paypal_capture_id || order.id,
            type: "Pack numérique",
            artworkTitle: order.Collections?.title || "Collection",
            buyerEmail: order.buyer_email,
            amount: order.amount,
            currency: order.currency,
            paymentMethod: "PayPal"
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
        .select("id, title, title_en, title_es, location, location_en, location_es, year, description, description_en, description_es, format, format_en, format_es, price_digital, price_physical, image_url, is_published")
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
                <legend class="display">Traductions</legend>
                <p class="dashboard-intro">Optionnel. Si un champ est vide, le site affichera la version française. Ces textes ne sont jamais traduits automatiquement.</p>
                <div class="form-grid">
                    <label class="form-field form-field-wide">Titre anglais
                        <input id="edit-artwork-title-en" type="text" maxlength="140">
                    </label>
                    <label class="form-field form-field-wide">Titre espagnol
                        <input id="edit-artwork-title-es" type="text" maxlength="140">
                    </label>
                    <label class="form-field">Lieu anglais
                        <input id="edit-artwork-location-en" type="text" maxlength="140">
                    </label>
                    <label class="form-field">Lieu espagnol
                        <input id="edit-artwork-location-es" type="text" maxlength="140">
                    </label>
                    <label class="form-field form-field-wide">Description anglaise
                        <textarea id="edit-artwork-description-en" rows="5" maxlength="1200"></textarea>
                    </label>
                    <label class="form-field form-field-wide">Description espagnole
                        <textarea id="edit-artwork-description-es" rows="5" maxlength="1200"></textarea>
                    </label>
                    <label class="form-field">Format de tirage anglais
                        <input id="edit-artwork-format-en" type="text" maxlength="140">
                    </label>
                    <label class="form-field">Format de tirage espagnol
                        <input id="edit-artwork-format-es" type="text" maxlength="140">
                    </label>
                </div>
            </fieldset>
            <fieldset class="form-section">
                <legend class="display">Remplacer la preview</legend>
                <p class="dashboard-intro">Choisissez directement un nouveau fichier ou une preview déjà envoyée. Le remplacement sera effectué uniquement à l’enregistrement.</p>
                <label class="replacement-upload-control" for="replacement-preview-file">
                    <span class="btn">Choisir une autre image</span>
                    <span id="replacement-preview-file-name">JPEG, PNG ou WebP · 15 Mo maximum</span>
                    <input id="replacement-preview-file" type="file" accept="image/jpeg,image/png,image/webp">
                </label>
                <label class="keep-current-preview is-selected">
                    <input name="replacement-upload-id" type="radio" value="" checked>
                    <span>Conserver l’image actuelle</span>
                </label>
                <div class="preview-choices" id="replacement-previews"></div>
            </fieldset>
            <fieldset class="form-section" id="instagram-story-section" ${artwork.is_published ? "" : "hidden"}>
                <legend class="display">Partager sur Instagram</legend>
                <p class="dashboard-intro">Envoie le lien de cette œuvre dans Telegram pour le copier directement dans le sticker « Lien » de ta story Instagram.</p>
                <button class="btn" id="send-instagram-story-link" type="button">Envoyer le lien dans Telegram</button>
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
    document.getElementById("edit-artwork-title-en").value = artwork.title_en || "";
    document.getElementById("edit-artwork-title-es").value = artwork.title_es || "";
    document.getElementById("edit-artwork-location").value = artwork.location || "";
    document.getElementById("edit-artwork-location-en").value = artwork.location_en || "";
    document.getElementById("edit-artwork-location-es").value = artwork.location_es || "";
    document.getElementById("edit-artwork-year").value = artwork.year || "";
    document.getElementById("edit-artwork-description").value = artwork.description || "";
    document.getElementById("edit-artwork-description-en").value = artwork.description_en || "";
    document.getElementById("edit-artwork-description-es").value = artwork.description_es || "";
    document.getElementById("edit-artwork-format").value = artwork.format || "";
    document.getElementById("edit-artwork-format-en").value = artwork.format_en || "";
    document.getElementById("edit-artwork-format-es").value = artwork.format_es || "";
    document.getElementById("edit-price-digital").value = artwork.price_digital ?? "";
    document.getElementById("edit-price-physical").value = artwork.price_physical ?? "";
    document.getElementById("edit-is-published").checked = artwork.is_published;

    if (successMessage) {
        const message = document.getElementById("edit-artwork-message");
        message.classList.add("is-success");
        message.textContent = successMessage;
    }

    loadReplacementPreviews();

    const replacementFileInput = document.getElementById("replacement-preview-file");
    const replacementFileName = document.getElementById("replacement-preview-file-name");
    let directReplacementFile = null;

    replacementFileInput.addEventListener("change", () => {
        const file = replacementFileInput.files[0];
        const message = document.getElementById("edit-artwork-message");

        directReplacementFile = null;
        message.classList.remove("is-success");
        message.textContent = "";

        if (!file) {
            replacementFileName.textContent = "JPEG, PNG ou WebP · 15 Mo maximum";
            return;
        }

        if (!CONFIG.PREVIEW_ALLOWED_TYPES.includes(file.type)) {
            replacementFileName.textContent = "JPEG, PNG ou WebP · 15 Mo maximum";
            message.textContent = "Choisissez une image JPEG, PNG ou WebP.";
            replacementFileInput.value = "";
            return;
        }

        if (file.size > CONFIG.PREVIEW_MAX_FILE_SIZE) {
            replacementFileName.textContent = "JPEG, PNG ou WebP · 15 Mo maximum";
            message.textContent = "La preview dépasse la limite de 15 Mo. Exportez une version plus légère.";
            replacementFileInput.value = "";
            return;
        }

        directReplacementFile = file;
        replacementFileName.textContent = `${file.name} · ${formatFileSize(file.size)} · sera utilisée à l’enregistrement`;
        document.querySelectorAll(".preview-choice").forEach((choice) => choice.classList.remove("is-selected"));
    });

    document.querySelector(".keep-current-preview input").addEventListener("change", () => {
        document.querySelectorAll(".preview-choice").forEach((choice) => choice.classList.remove("is-selected"));
    });

    document.getElementById("cancel-artwork-edit").addEventListener("click", () => renderArtworkList(user));

    const storyLinkButton = document.getElementById("send-instagram-story-link");
    if (storyLinkButton) {
        storyLinkButton.addEventListener("click", async () => {
            const message = document.getElementById("edit-artwork-message");
            storyLinkButton.disabled = true;
            storyLinkButton.textContent = "Envoi dans Telegram…";
            message.classList.remove("is-success");
            message.textContent = "";

            try {
                await studioRequest("/.netlify/functions/telegram-artwork-link", "POST", { artworkId: artwork.id });
                message.classList.add("is-success");
                message.textContent = "Lien envoyé. Ouvre Telegram, copie-le puis colle-le dans le sticker « Lien » de ta story.";
            } catch (error) {
                message.textContent = error.message || "Le lien n’a pas pu être envoyé dans Telegram.";
            } finally {
                storyLinkButton.disabled = false;
                storyLinkButton.textContent = "Envoyer le lien dans Telegram";
            }
        });
    }

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

        let replacementUploadId = replacement?.value || null;

        if (directReplacementFile) {
            try {
                message.textContent = "Envoi de la nouvelle preview…";
                replacementUploadId = await uploadPublicationPreview(directReplacementFile, user);
            } catch (uploadError) {
                console.error("Impossible d’envoyer la nouvelle preview :", uploadError);
                button.disabled = false;
                button.textContent = "Enregistrer les modifications";
                message.textContent = uploadError.message || "La nouvelle image n’a pas pu être envoyée.";
                return;
            }
        }

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
            p_replacement_upload_id: replacementUploadId
        });

        if (updateError) {
            console.error("Impossible de modifier l’œuvre :", updateError);
            button.disabled = false;
            button.textContent = "Enregistrer les modifications";
            message.textContent = "Les modifications n’ont pas pu être enregistrées. Réessayez.";
            return;
        }

        const translationValues = {
            title_en: document.getElementById("edit-artwork-title-en").value.trim() || null,
            title_es: document.getElementById("edit-artwork-title-es").value.trim() || null,
            location_en: document.getElementById("edit-artwork-location-en").value.trim() || null,
            location_es: document.getElementById("edit-artwork-location-es").value.trim() || null,
            description_en: document.getElementById("edit-artwork-description-en").value.trim() || null,
            description_es: document.getElementById("edit-artwork-description-es").value.trim() || null,
            format_en: document.getElementById("edit-artwork-format-en").value.trim() || null,
            format_es: document.getElementById("edit-artwork-format-es").value.trim() || null
        };
        const { error: translationError } = await supabaseClient
            .from(CONFIG.ARTWORKS_TABLE)
            .update(translationValues)
            .eq("id", artwork.id);

        if (translationError) {
            console.error("Impossible d’enregistrer les traductions :", translationError);
            button.disabled = false;
            button.textContent = "Enregistrer les modifications";
            message.textContent = "Les informations françaises sont enregistrées, mais les traductions n’ont pas pu l’être.";
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
