(function () {
    const config = window.PATAS_SUPABASE_CONFIG || {};
    const library = window.supabase;
    const hasSettings = Boolean(config.url && config.anonKey);
    const configured = Boolean(hasSettings && library);
    const client = configured
        ? library.createClient(config.url, config.anonKey)
        : null;

    function getClient() {
        if (!client) {
            if (!hasSettings) {
                throw new Error(
                    "O Supabase ainda não foi configurado. Consulte o README.md."
                );
            }
            throw new Error(
                "A biblioteca do Supabase não carregou. Verifique a conexão com a internet e tente novamente."
            );
        }

        return client;
    }

    function showMessage(element, text, isError) {
        element.textContent = text;
        element.style.display = "block";
        element.classList.toggle("error", Boolean(isError));
    }

    function errorMessage(error) {
        if (error && error.message) {
            return error.message;
        }

        return "Ocorreu um erro inesperado. Tente novamente.";
    }

    async function getCurrentUser() {
        const auth = getClient().auth;
        const { data: sessionData, error: sessionError } = await auth.getSession();
        if (sessionError) {
            throw sessionError;
        }
        if (!sessionData.session) {
            return null;
        }

        const { data, error } = await auth.getUser();
        if (error) {
            throw error;
        }

        return data.user;
    }

    async function requireUser() {
        const user = await getCurrentUser();
        if (!user) {
            window.location.href = "login.html";
            throw new Error("Entre na sua conta para continuar.");
        }

        return user;
    }

    function escapeHtml(value) {
        return String(value || "").replace(/[&<>"']/g, function (character) {
            return {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            }[character];
        });
    }

    function normalize(value) {
        return String(value || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim();
    }

    function animalEmoji(type) {
        if (type === "Cachorro") {
            return "🐕";
        }
        if (type === "Gato") {
            return "🐈";
        }
        return "🐾";
    }

    function createListingCard(listing, category) {
        const name = escapeHtml(listing.pet_name);
        const type = escapeHtml(listing.pet_type);
        const characteristics = escapeHtml(listing.characteristics);
        const city = escapeHtml(listing.city);
        const neighborhood = escapeHtml(listing.neighborhood);
        const description = escapeHtml(listing.description || characteristics);
        const typeFilter = normalize(listing.pet_type);
        const searchTerms = normalize([
            listing.pet_name,
            listing.pet_type,
            listing.characteristics,
            listing.city,
            listing.neighborhood,
            listing.description
        ].join(" "));
        const location = city + " · " + neighborhood;
        const searchLocation = normalize(
            listing.city + " " + listing.neighborhood
        );
        const emoji = animalEmoji(listing.pet_type);

        if (category === "adoption") {
            return '<article class="pet-card" data-listing-id="' + listing.id +
                '" data-nome="' + escapeHtml(searchTerms) +
                '" data-tipo="' + escapeHtml(typeFilter) +
                '" data-cidade="' + escapeHtml(searchLocation) + '">' +
                '<div class="pet-imagem"><span class="tag">💚 Para adoção</span>' +
                '<span class="emoji-pet">' + emoji + '</span></div>' +
                '<div class="pet-conteudo"><div class="pet-topo"><h3>' + name +
                '</h3></div><p class="local">📍 ' + location +
                '</p><p class="descricao">' + description +
                '</p><div class="caracteristicas"><span>' + type +
                '</span><span>' + characteristics + '</span></div>' +
                '<button class="botao-adotar" type="button" data-listing-id="' +
                listing.id + '" data-pet="' + name +
                '">Tenho interesse ♥</button></div></article>';
        }

        const isLost = category === "lost";
        const status = isLost ? "Desaparecido" : "Encontrado";
        const buttonClass = isLost ? "contactButton" : "infoButton";
        const buttonLabel = isLost ? "Tenho informações" : "Tenho informações";
        const styleClass = normalize(listing.pet_type) === "cachorro"
            ? "dog"
            : normalize(listing.pet_type) === "gato" ? "cat" : "other";

        return '<article class="animal-card" data-listing-id="' + listing.id +
            '" data-name="' + escapeHtml(searchTerms) +
            '" data-type="' + escapeHtml(typeFilter) +
            '" data-city="' + escapeHtml(searchLocation) + '">' +
            '<div class="animal-visual ' + styleClass + '"><span class="status">' +
            status + '</span>' + emoji + '</div><div class="animal-info">' +
            '<h3>' + name + '</h3><div class="animal-meta">' + type +
            ' · ' + characteristics + '</div><p class="animal-description">' +
            description + '</p><div class="animal-location"><span>📍</span>' +
            '<span>' + location + '</span></div><button type="button" ' +
            'class="button button-secondary ' + buttonClass +
            '" data-listing-id="' + listing.id + '" data-animal="' + name +
            '">' + buttonLabel + '</button></div></article>';
    }

    async function loadListings(category) {
        const { data, error } = await getClient()
            .from("animal_listings")
            .select("id, category, pet_name, pet_type, characteristics, city, neighborhood, description, event_date, event_time, status, created_at")
            .eq("category", category)
            .eq("status", "active")
            .order("created_at", { ascending: false });
        if (error) {
            throw error;
        }
        return data;
    }

    async function getListingContact(listingId) {
        const { data, error } = await getClient()
            .rpc("get_listing_contact", { p_listing_id: listingId });
        if (error) {
            throw error;
        }
        if (!data || !data.length) {
            throw new Error("O contato deste anúncio não está disponível.");
        }
        return data[0];
    }

    window.PatasApp = {
        configured: configured,
        getClient: getClient,
        getCurrentUser: getCurrentUser,
        requireUser: requireUser,
        showMessage: showMessage,
        errorMessage: errorMessage,
        escapeHtml: escapeHtml,
        normalize: normalize,
        createListingCard: createListingCard,
        loadListings: loadListings,
        getListingContact: getListingContact
    };

    const headerLoginLink = document.querySelector("header a[href='login.html']");
    if (configured && headerLoginLink) {
        const originalText = headerLoginLink.textContent;
        const logoutLink = document.createElement("a");
        logoutLink.href = "#sair";
        logoutLink.textContent = "Sair";
        logoutLink.className = headerLoginLink.className;
        logoutLink.addEventListener("click", async function (event) {
            event.preventDefault();
            try {
                const { error } = await client.auth.signOut();
                if (error) {
                    throw error;
                }
                window.location.href = "login.html";
            } catch (error) {
                window.alert(errorMessage(error));
            }
        });

        client.auth.onAuthStateChange(function (_event, session) {
            if (session && session.user) {
                headerLoginLink.href = "adocao.html#gerenciar";
                headerLoginLink.textContent = "Gerenciar";
                if (!logoutLink.isConnected) {
                    headerLoginLink.insertAdjacentElement("afterend", logoutLink);
                }
            } else {
                headerLoginLink.href = "login.html";
                headerLoginLink.textContent = originalText;
                logoutLink.remove();
            }
        });
    }

    if (!configured) {
        document.documentElement.dataset.supabase = hasSettings
            ? "library-unavailable"
            : "not-configured";
    }
})();
