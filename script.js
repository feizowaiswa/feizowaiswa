// Script loading test
console.log('🚀 script.js loaded successfully');

// Hero Slideshow
let slides = null;
let currentSlide = 0;
let slideInterval = null;

function showSlide(index) {
    if (!slides || slides.length === 0) return;
    
    // Remove active class from all slides
    slides.forEach(slide => slide.classList.remove('active'));
    
    // Add active class to current slide
    if (slides[index]) {
        slides[index].classList.add('active');
    }

    function submitToGoogleForm(section, review) {
        try {
            const url = section.dataset.gformUrl;
            if (!url) return;
            const map = {
                rating: section.dataset.gformRating,
                name: section.dataset.gformName,
                email: section.dataset.gformEmail,
                title: section.dataset.gformTitle,
                text: section.dataset.gformText,
                consent: section.dataset.gformConsent
            };
            // minimally require rating, name, text
            if (!map.rating || !map.name || !map.text) {
                console.warn('Google Form mapping missing required entries. Provide data-gform-rating, data-gform-name, data-gform-text.');
                return;
            }
            const iframe = document.createElement('iframe');
            iframe.name = 'gform_iframe_' + Date.now();
            iframe.style.display = 'none';
            document.body.appendChild(iframe);

            const form = document.createElement('form');
            form.method = 'POST';
            form.action = url;
            form.target = iframe.name;

            function add(name, value) {
                if (!name) return;
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = name;
                input.value = String(value || '');
                form.appendChild(input);
            }
            add(map.rating, review.rating);
            add(map.name, review.name);
            add(map.email, review.email);
            add(map.title, review.title);
            add(map.text, review.text);
            add(map.consent, 'Yes');

            document.body.appendChild(form);
            form.submit();
            // cleanup later
            setTimeout(() => { form.remove(); iframe.remove(); }, 4000);
        } catch (e) {
            console.warn('Failed to submit to Google Form', e);
        }
    }
}

function nextSlide() {
    if (!slides || slides.length === 0) return;
    currentSlide = (currentSlide + 1) % slides.length;
    showSlide(currentSlide);
}

function startSlideshow() {
    if (!slides || slides.length === 0) return;
    slideInterval = setInterval(nextSlide, 5000); // Change slide every 5 seconds
}

function stopSlideshow() {
    if (slideInterval) {
        clearInterval(slideInterval);
        slideInterval = null;
    }
}

// Initialize slideshow
function initializeSlideshow() {
    slides = document.querySelectorAll('.slide');
    
    if (slides && slides.length > 0) {
        // Ensure first slide is active
        showSlide(0);
        
        // Start the slideshow
        startSlideshow();
        
        // Add hover/touch controls
        const slideshow = document.querySelector('.hero-slideshow');
        if (slideshow) {
            // Remove any existing listeners first
            slideshow.removeEventListener('mouseenter', stopSlideshow);
            slideshow.removeEventListener('mouseleave', startSlideshow);
            slideshow.removeEventListener('touchstart', stopSlideshow);
            slideshow.removeEventListener('touchend', startSlideshow);
            
            // Add new listeners
            if (isTouchDevice()) {
                slideshow.addEventListener('touchstart', stopSlideshow, { passive: true });
                slideshow.addEventListener('touchend', () => {
                    setTimeout(startSlideshow, 3000);
                }, { passive: true });
            } else {
                slideshow.addEventListener('mouseenter', stopSlideshow);
                slideshow.addEventListener('mouseleave', startSlideshow);
            }
        }
    }

    function loadGoogleReviews() {
        try {
            const source = (section.dataset.reviewsSource || '').toLowerCase();
            if (source !== 'google') return;
            const sheetId = section.dataset.gsheetId;
            const sheetName = section.dataset.gsheetSheet || 'Form Responses 1';
            if (!sheetId) return;
            const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
            fetch(url)
                .then(r => r.text())
                .then(txt => {
                    const start = txt.indexOf('(');
                    const end = txt.lastIndexOf(')');
                    if (start === -1 || end === -1) throw new Error('Invalid gviz response');
                    const json = JSON.parse(txt.substring(start + 1, end));
                    const table = json.table || {};
                    const cols = (table.cols || []).map(c => (c.label || '').toLowerCase());
                    function findIndex(names) {
                        const arr = Array.isArray(names) ? names : [names];
                        for (const name of arr) {
                            const idx = cols.findIndex(l => l.includes(name));
                            if (idx !== -1) return idx;
                        }
                        return -1;
                    }
                    const idx = {
                        timestamp: findIndex(['timestamp', 'date']),
                        name: findIndex(['name']),
                        email: findIndex(['email']),
                        rating: findIndex(['rating', 'stars']),
                        title: findIndex(['title', 'trip']),
                        text: findIndex(['review', 'your review', 'message', 'comments']),
                        consent: findIndex(['consent'])
                    };
                    const rows = table.rows || [];
                    rows.forEach(row => {
                        const c = row.c || [];
                        function val(i) { return (i >= 0 && c[i]) ? (c[i].v ?? c[i].f ?? '') : ''; }
                        const rating = parseInt(val(idx.rating) || '0', 10) || 0;
                        const name = String(val(idx.name) || '').trim();
                        const email = String(val(idx.email) || '').trim();
                        const title = String(val(idx.title) || '').trim();
                        const text = String(val(idx.text) || '').trim();
                        const tsRaw = val(idx.timestamp);
                        const timestamp = typeof tsRaw === 'number' ? tsRaw : (Date.parse(tsRaw) || Date.now());
                        if (!rating || !text || !name) return;
                        const review = { rating, name, email, title, text, timestamp };
                        appendReviewCard(review);
                    });
                    // After loading external, resort according to current selection
                    const sortSelect = document.getElementById('reviewSort');
                    if (sortSelect) sortCards(sortSelect.value);
                })
                .catch(err => console.warn('Failed to load Google Sheet reviews', err));
        } catch (e) {
            console.warn('Google reviews error', e);
        }
    }
}

// Touch device detection
function isTouchDevice() {
    return (('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0));
}

// Initialize slideshow when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSlideshow);
            } else {
    initializeSlideshow();
}

// Fallback initialization
setTimeout(initializeSlideshow, 100);

// Language Switcher Functionality
let currentLanguage = 'en';
const translations = {
    en: {
        'nav-home': 'Home',
        'nav-about': 'About',
        'nav-destinations': 'Destinations',
        'nav-tours': 'Tours',
        'nav-gallery': 'Gallery',
        'nav-contact': 'Contact',
        'nav-blog': 'Blog',
        'nav-faq': 'FAQ',
        'hero-title': 'Experience Uganda\'s Wild Beauty',
        'hero-subtitle': 'Discover the Pearl of Africa with our expert-guided safari adventures',
        'book-now': 'Book Now',
        'learn-more': 'Learn More',
        'about-title': 'About Us',
        'about-subtitle': 'Your Gateway to Uganda\'s Wild Adventures',
        'about-story': 'Our Story',
        'about-story-text': 'Founded with a passion for exploration and a commitment to sustainable tourism, Dragon Flys Expeditions has been leading adventurers to the world\'s most incredible destinations since 2022. We believe that travel should not only be exciting but also responsible and enriching.',
        'about-mission': 'Our Mission',
        'about-mission-text': 'To provide unforgettable adventure experiences while promoting environmental conservation and cultural appreciation. We strive to connect travelers with authentic local experiences and breathtaking natural wonders.',
        'destinations-title': 'Explore Uganda\'s National Parks',
        'tours-title': 'Our Safari Tours & Adventures',
        'gallery-title': 'Gallery',
        'gallery-subtitle': 'Explore stunning moments from our Uganda safari adventures',
        'gallery-all': 'All Photos',
        'gallery-gorillas': 'Gorilla Trekking',
        'gallery-wildlife': 'Wildlife',
        'gallery-landscapes': 'Landscapes',
        'gallery-cultural': 'Cultural',
        'gallery-cta-title': 'Want to Experience These Moments?',
        'gallery-cta-text': 'Join us on your next Uganda safari adventure',
        'gallery-cta-button': 'View Our Tours',
        'videos-title': 'Client Adventure Videos',
        'videos-subtitle': 'Watch real experiences from our amazing clients around the world',
        'contact-title': 'Contact Us',
        'footer-text': 'Dragon Flys Expeditions - Your Gateway to Uganda\'s Wild Adventures',
        'tagline': 'Uganda Safari Adventures',
        'hero-explore': 'Explore Tours',
        'hero-book': 'Book Now',
        'murchison-title': 'Murchison Falls Adventure',
        'murchison-desc': 'Witness the world\'s most powerful waterfall, spot shoebill storks, and encounter abundant wildlife',
        'queen-title': 'Queen Elizabeth Wildlife',
        'queen-desc': 'Encounter tree-climbing lions and explore stunning crater lakes',
        'kibale-title': 'Kibale Chimpanzee Tracking',
        'kibale-desc': 'Track chimpanzees with the highest density in East Africa in pristine rainforest',
        'mburo-title': 'Lake Mburo Safari',
        'mburo-desc': 'Walk among zebras and antelopes in this unique park',
        'bwindi-title': 'Bwindi Gorilla Trekking',
        'bwindi-desc': 'UNESCO World Heritage Site encounters with mountain gorillas in pristine rainforest',
        'about-values': 'Our Values',
        'about-values-note': 'We actively champion conservation initiatives and responsible tourism in partnership with local stakeholders and institutions such as the Uganda Wildlife Authority.',
        'conservation-heading': 'Our Conservation Commitment',
        'about-testimonials': 'What Our Adventurers Say',
        'testimonial-1': 'An absolutely incredible experience! The guides were knowledgeable and the landscapes were breathtaking. Can\'t wait to book my next adventure!',
        'testimonial-2': 'Dragon Flys Expeditions exceeded all expectations. The attention to detail and commitment to sustainability made this trip truly special.',
        'testimonial-3': 'Professional, safe, and incredibly fun! The team made sure we had the adventure of a lifetime while respecting local cultures.',
        'tripadvisor-heading': 'Verified Reviews on TripAdvisor',
        'tripadvisor-desc': 'Join thousands of satisfied adventurers who have shared their authentic Uganda safari experiences. Read verified reviews, see real photos from our tours, and discover why travelers consistently choose Dragon Flys Expeditions for their African adventures.',
        'recent-reviews': 'Recent Verified Reviews',
        'read-more': 'Read more',
        'read-less': 'Read less',
        'review-1': 'Absolutely phenomenal experience with Dragon Flys Expeditions! The gorilla trekking in Bwindi was life-changing. Our guide Baguma Daniel was incredibly knowledgeable about wildlife and local culture. Highly recommend!',
        'review-2': 'The 13-day Uganda safari exceeded all expectations. From Murchison Falls to Queen Elizabeth National Park, every day was an adventure. The tree-climbing lions in Ishasha were amazing! Professional service throughout.'
    },
    fr: {
        'nav-home': 'Accueil',
        'nav-about': 'À propos',
        'nav-destinations': 'Destinations',
        'nav-tours': 'Tours',
        'nav-gallery': 'Galerie',
        'nav-contact': 'Contact',
        'nav-blog': 'Blog',
        'nav-faq': 'FAQ',
        'hero-title': 'Découvrez la beauté sauvage de l\'Ouganda',
        'hero-subtitle': 'Explorez la perle de l\'Afrique avec nos aventures safari guidées par des experts',
        'book-now': 'Réserver',
        'learn-more': 'En savoir plus',
        'about-title': 'À propos de nous',
        'about-subtitle': 'Votre porte d\'entrée vers les aventures sauvages de l\'Ouganda',
        'about-story': 'Notre histoire',
        'about-story-text': 'Fondée avec une passion pour l\'exploration et un engagement envers le tourisme durable, Dragon Flys Expeditions guide les aventuriers vers les destinations les plus incroyables du monde depuis 2022. Nous croyons que le voyage doit être non seulement excitant mais aussi responsable et enrichissant.',
        'about-mission': 'Notre mission',
        'about-mission-text': 'Offrir des expériences d\'aventure inoubliables tout en promouvant la conservation de l\'environnement et l\'appréciation culturelle. Nous nous efforçons de connecter les voyageurs avec des expériences locales authentiques et des merveilles naturelles à couper le souffle.',
        'destinations-title': 'Explorez les parcs nationaux de l\'Ouganda',
        'tours-title': 'Nos tours safari et aventures',
        'gallery-title': 'Galerie',
        'gallery-subtitle': 'Explorez les moments époustouflants de nos aventures safari en Ouganda',
        'gallery-all': 'Toutes les Photos',
        'gallery-gorillas': 'Trekking Gorilles',
        'gallery-wildlife': 'Vie Sauvage',
        'gallery-landscapes': 'Paysages',
        'gallery-cultural': 'Culturel',
        'gallery-cta-title': 'Voulez-vous Vivre Ces Moments ?',
        'gallery-cta-text': 'Rejoignez-nous pour votre prochaine aventure safari en Ouganda',
        'gallery-cta-button': 'Voir Nos Tours',
        'videos-title': 'Vidéos d\'Aventure Client',
        'videos-subtitle': 'Regardez les vraies expériences de nos clients incroyables du monde entier',
        'contact-title': 'Contactez-nous',
        'footer-text': 'Dragon Flys Expeditions - Votre porte d\'entrée vers les aventures sauvages de l\'Ouganda',
        'tagline': 'Aventures Safari Ouganda',
        'hero-explore': 'Explorer les Tours',
        'hero-book': 'Réserver',
        'murchison-title': 'Aventure des Chutes Murchison',
        'murchison-desc': 'Témoignez de la cascade la plus puissante du monde, observez les becs-en-sabot et rencontrez une faune abondante',
        'queen-title': 'Faune de Queen Elizabeth',
        'queen-desc': 'Rencontrez des lions grimpeurs et explorez de magnifiques lacs de cratère',
        'kibale-title': 'Suivi des Chimpanzés de Kibale',
        'kibale-desc': 'Suivez les chimpanzés avec la plus forte densité d\'Afrique de l\'Est dans la forêt tropicale vierge',
        'mburo-title': 'Safari du Lac Mburo',
        'mburo-desc': 'Marchez parmi les zèbres et les antilopes dans ce parc unique',
        'bwindi-title': 'Randonnée Gorilles de Bwindi',
        'bwindi-desc': 'Rencontres avec les gorilles de montagne sur le site du patrimoine mondial UNESCO dans la forêt tropicale vierge',
        'about-values': 'Nos valeurs',
        'about-values-note': 'Nous défendons activement les initiatives de conservation et le tourisme responsable en partenariat avec les parties prenantes locales et les institutions telles que l\'Autorité de la faune de l\'Ouganda.',
        'conservation-heading': 'Notre engagement pour la conservation',
        'about-testimonials': 'Ce que disent nos aventuriers',
        'testimonial-1': 'Une expérience absolument incroyable ! Les guides étaient compétents et les paysages à couper le souffle. J\'ai hâte de réserver ma prochaine aventure !',
        'testimonial-2': 'Dragon Flys Expeditions a dépassé toutes les attentes. L\'attention aux détails et l\'engagement envers la durabilité ont rendu ce voyage vraiment spécial.',
        'testimonial-3': 'Professionnel, sûr et incroyablement amusant ! L\'équipe s\'est assurée que nous ayons l\'aventure d\'une vie tout en respectant les cultures locales.',
        'tripadvisor-heading': 'Avis vérifiés sur TripAdvisor',
        'tripadvisor-desc': 'Rejoignez des milliers d\'aventuriers satisfaits qui ont partagé leurs expériences authentiques de safari en Ouganda. Lisez les avis vérifiés, voyez de vraies photos de nos tours, et découvrez pourquoi les voyageurs choisissent constamment Dragon Flys Expeditions pour leurs aventures africaines.',
        'recent-reviews': 'Avis vérifiés récents',
        'read-more': 'Lire plus',
        'read-less': 'Lire moins',
        'review-1': 'Expérience absolument phénoménale avec Dragon Flys Expeditions ! La randonnée gorilles à Bwindi a changé ma vie. Notre guide Baguma Daniel était incroyablement compétent sur la faune et la culture locale. Je recommande vivement !',
        'review-2': 'Le safari de 13 jours en Ouganda a dépassé toutes les attentes. Des chutes Murchison au parc national Queen Elizabeth, chaque jour était une aventure. Les lions grimpeurs à Ishasha étaient incroyables ! Service professionnel tout au long.'
    },
    es: {
        'nav-home': 'Inicio',
        'nav-about': 'Acerca de',
        'nav-destinations': 'Destinos',
        'nav-tours': 'Tours',
        'nav-gallery': 'Galería',
        'nav-contact': 'Contacto',
        'nav-blog': 'Blog',
        'nav-faq': 'FAQ',
        'hero-title': 'Experimenta la belleza salvaje de Uganda',
        'hero-subtitle': 'Descubre la perla de África con nuestras aventuras safari guiadas por expertos',
        'book-now': 'Reservar',
        'learn-more': 'Saber más',
        'about-title': 'Acerca de nosotros',
        'about-subtitle': 'Tu puerta de entrada a las aventuras salvajes de Uganda',
        'about-story': 'Nuestra historia',
        'about-story-text': 'Fundada con una pasión por la exploración y un compromiso con el turismo sostenible, Dragon Flys Expeditions ha estado guiando aventureros a los destinos más increíbles del mundo desde 2022. Creemos que el viaje no solo debe ser emocionante sino también responsable y enriquecedor.',
        'about-mission': 'Nuestra misión',
        'about-mission-text': 'Proporcionar experiencias de aventura inolvidables mientras promovemos la conservación ambiental y la apreciación cultural. Nos esforzamos por conectar a los viajeros con experiencias locales auténticas y maravillas naturales impresionantes.',
        'destinations-title': 'Explora los parques nacionales de Uganda',
        'tours-title': 'Nuestros tours safari y aventuras',
        'gallery-title': 'Galería',
        'gallery-subtitle': 'Explora momentos impresionantes de nuestras aventuras safari en Uganda',
        'gallery-all': 'Todas las Fotos',
        'gallery-gorillas': 'Trekking de Gorilas',
        'gallery-wildlife': 'Vida Silvestre',
        'gallery-landscapes': 'Paisajes',
        'gallery-cultural': 'Cultural',
        'gallery-cta-title': '¿Quieres Experimentar Estos Momentos?',
        'gallery-cta-text': 'Únete a nosotros en tu próxima aventura safari en Uganda',
        'gallery-cta-button': 'Ver Nuestros Tours',
        'videos-title': 'Videos de Aventura de Clientes',
        'videos-subtitle': 'Mira experiencias reales de nuestros increíbles clientes de todo el mundo',
        'contact-title': 'Contáctanos',
        'footer-text': 'Dragon Flys Expeditions - Tu puerta de entrada a las aventuras salvajes de Uganda',
        'tagline': 'Aventuras Safari Uganda',
        'hero-explore': 'Explorar Tours',
        'hero-book': 'Reservar',
        'murchison-title': 'Aventura de las Cataratas Murchison',
        'murchison-desc': 'Presencia la cascada más poderosa del mundo, avista cigüeñas picozapatos y encuentra abundante vida silvestre',
        'queen-title': 'Vida Silvestre Queen Elizabeth',
        'queen-desc': 'Encuentra leones trepadores y explora impresionantes lagos de cráter',
        'kibale-title': 'Seguimiento de Chimpancés Kibale',
        'kibale-desc': 'Rastrea chimpancés con la mayor densidad de África Oriental en selva tropical virgen',
        'mburo-title': 'Safari del Lago Mburo',
        'mburo-desc': 'Camina entre cebras y antílopes en este parque único',
        'bwindi-title': 'Trekking de Gorilas Bwindi',
        'bwindi-desc': 'Encuentros con gorilas de montaña en el sitio del Patrimonio Mundial de la UNESCO en selva tropical virgen',
        'about-values': 'Nuestros valores',
        'about-values-note': 'Defendemos activamente las iniciativas de conservación y el turismo responsable en asociación con las partes interesadas locales y las instituciones como la Autoridad de Vida Silvestre de Uganda.',
        'conservation-heading': 'Nuestro compromiso con la conservación',
        'about-testimonials': 'Lo que dicen nuestros aventureros',
        'testimonial-1': '¡Una experiencia absolutamente increíble! Los guías eran conocedores y los paisajes eran impresionantes. ¡No puedo esperar a reservar mi próxima aventura!',
        'testimonial-2': 'Dragon Flys Expeditions superó todas las expectativas. La atención al detalle y el compromiso con la sostenibilidad hicieron este viaje realmente especial.',
        'testimonial-3': '¡Profesional, seguro e increíblemente divertido! El equipo se aseguró de que tuviéramos la aventura de nuestras vidas mientras respetaba las culturas locales.',
        'tripadvisor-heading': 'Reseñas verificadas en TripAdvisor',
        'tripadvisor-desc': 'Únete a miles de aventureros satisfechos que han compartido sus experiencias auténticas de safari en Uganda. Lee reseñas verificadas, ve fotos reales de nuestros tours, y descubre por qué los viajeros eligen consistentemente Dragon Flys Expeditions para sus aventuras africanas.',
        'recent-reviews': 'Reseñas verificadas recientes',
        'read-more': 'Leer más',
        'read-less': 'Leer menos',
        'review-1': '¡Experiencia absolutamente fenomenal con Dragon Flys Expeditions! El trekking de gorilas en Bwindi fue transformador. Nuestro guía Baguma Daniel era increíblemente conocedor sobre la vida silvestre y la cultura local. ¡Altamente recomendado!',
        'review-2': 'El safari de 13 días en Uganda superó todas las expectativas. Desde las Cataratas Murchison hasta el Parque Nacional Queen Elizabeth, cada día fue una aventura. ¡Los leones trepadores en Ishasha fueron increíbles! Servicio profesional durante toda la estadía.'
    },
    de: {
        'nav-home': 'Startseite',
        'nav-about': 'Über uns',
        'nav-destinations': 'Reiseziele',
        'nav-tours': 'Touren',
        'nav-gallery': 'Galerie',
        'nav-contact': 'Kontakt',
        'nav-blog': 'Blog',
        'nav-faq': 'FAQ',
        'hero-title': 'Erleben Sie Ugandas wilde Schönheit',
        'hero-subtitle': 'Entdecken Sie die Perle Afrikas mit unseren expertengeführten Safari-Abenteuern',
        'book-now': 'Jetzt buchen',
        'learn-more': 'Mehr erfahren',
        'about-title': 'Über uns',
        'about-subtitle': 'Ihr Tor zu Ugandas wilden Abenteuern',
        'about-story': 'Unsere Geschichte',
        'about-story-text': 'Gegründet mit einer Leidenschaft für Erkundung und einem Engagement für nachhaltigen Tourismus, führt Dragon Flys Expeditions seit 2022 Abenteurer zu den unglaublichsten Zielen der Welt. Wir glauben, dass Reisen nicht nur aufregend, sondern auch verantwortungsvoll und bereichernd sein sollte.',
        'about-mission': 'Unsere Mission',
        'about-mission-text': 'Unvergessliche Abenteuererfahrungen zu bieten und gleichzeitig Umweltschutz und kulturelle Wertschätzung zu fördern. Wir bemühen uns, Reisende mit authentischen lokalen Erfahrungen und atemberaubenden Naturwundern zu verbinden.',
        'destinations-title': 'Erkunden Sie Ugandas Nationalparks',
        'tours-title': 'Unsere Safari-Touren und Abenteuer',
        'gallery-title': 'Galerie',
        'gallery-subtitle': 'Erkunden Sie atemberaubende Momente aus unseren Uganda-Safari-Abenteuern',
        'gallery-all': 'Alle Fotos',
        'gallery-gorillas': 'Gorilla Trekking',
        'gallery-wildlife': 'Wildtiere',
        'gallery-landscapes': 'Landschaften',
        'gallery-cultural': 'Kulturell',
        'gallery-cta-title': 'Möchten Sie Diese Momente Erleben?',
        'gallery-cta-text': 'Begleiten Sie uns auf Ihrem nächsten Uganda-Safari-Abenteuer',
        'gallery-cta-button': 'Unsere Touren Ansehen',
        'videos-title': 'Kunden-Abenteuer-Videos',
        'videos-subtitle': 'Sehen Sie echte Erfahrungen unserer erstaunlichen Kunden aus der ganzen Welt',
        'contact-title': 'Kontaktieren Sie uns',
        'footer-text': 'Dragon Flys Expeditions - Ihr Tor zu Ugandas wilden Abenteuern',
        'tagline': 'Uganda Safari Abenteuer',
        'hero-explore': 'Touren erkunden',
        'hero-book': 'Jetzt buchen',
        'murchison-title': 'Murchison Falls Abenteuer',
        'murchison-desc': 'Erleben Sie den mächtigsten Wasserfall der Welt, entdecken Sie Schuhschnabelstörche und begegnen Sie reichhaltiger Tierwelt',
        'queen-title': 'Queen Elizabeth Tierwelt',
        'queen-desc': 'Begegnen Sie kletternden Löwen und erkunden Sie atemberaubende Kraterseen',
        'kibale-title': 'Kibale Schimpansen-Tracking',
        'kibale-desc': 'Verfolgen Sie Schimpansen mit der höchsten Dichte in Ostafrika im unberührten Regenwald',
        'mburo-title': 'Lake Mburo Safari',
        'mburo-desc': 'Spazieren Sie zwischen Zebras und Antilopen in diesem einzigartigen Park',
        'bwindi-title': 'Bwindi Gorilla Trekking',
        'bwindi-desc': 'Begegnungen mit Berggorillas im UNESCO-Weltkulturerbe in unberührtem Regenwald',
        'about-values': 'Unsere Werte',
        'about-values-note': 'Wir setzen uns aktiv für Naturschutzinitiativen und verantwortungsvollen Tourismus in Partnerschaft mit lokalen Interessengruppen und Institutionen wie der Uganda Wildlife Authority ein.',
        'conservation-heading': 'Unser Engagement für den Naturschutz',
        'about-testimonials': 'Was unsere Abenteurer sagen',
        'testimonial-1': 'Ein absolut unglaubliches Erlebnis! Die Führer waren sachkundig und die Landschaften atemberaubend. Ich kann es kaum erwarten, mein nächstes Abenteuer zu buchen!',
        'testimonial-2': 'Dragon Flys Expeditions übertraf alle Erwartungen. Die Aufmerksamkeit für Details und das Engagement für Nachhaltigkeit machten diese Reise wirklich besonders.',
        'testimonial-3': 'Professionell, sicher und unglaublich spaßig! Das Team sorgte dafür, dass wir das Abenteuer unseres Lebens hatten und dabei die lokalen Kulturen respektierten.',
        'tripadvisor-heading': 'Verifizierte Bewertungen auf TripAdvisor',
        'tripadvisor-desc': 'Schließen Sie sich Tausenden von zufriedenen Abenteurern an, die ihre authentischen Uganda-Safari-Erfahrungen geteilt haben. Lesen Sie verifizierte Bewertungen, sehen Sie echte Fotos von unseren Touren und entdecken Sie, warum Reisende konsequent Dragon Flys Expeditions für ihre afrikanischen Abenteuer wählen.',
        'recent-reviews': 'Aktuelle verifizierte Bewertungen',
        'read-more': 'Mehr lesen',
        'read-less': 'Weniger lesen',
        'review-1': 'Absolut phänomenale Erfahrung mit Dragon Flys Expeditions! Das Gorilla-Trekking in Bwindi war lebensverändernd. Unser Führer Baguma Daniel war unglaublich sachkundig über Wildtiere und lokale Kultur. Sehr empfehlenswert!',
        'review-2': 'Die 13-tägige Uganda-Safari übertraf alle Erwartungen. Von den Murchison Falls bis zum Queen Elizabeth National Park war jeder Tag ein Abenteuer. Die baumkletternden Löwen in Ishasha waren erstaunlich! Professioneller Service während der gesamten Zeit.'
    },
    nl: {
        'nav-home': 'Home',
        'nav-about': 'Over ons',
        'nav-destinations': 'Bestemmingen',
        'nav-tours': 'Rondleidingen',
        'nav-gallery': 'Galerij',
        'nav-contact': 'Contact',
        'nav-blog': 'Blog',
        'nav-faq': 'FAQ',
        'hero-title': 'Ervaar de wilde schoonheid van Oeganda',
        'hero-subtitle': 'Ontdek de parel van Afrika met onze expertgeleide safari-avonturen',
        'book-now': 'Boek nu',
        'learn-more': 'Meer weten',
        'about-title': 'Over ons',
        'about-subtitle': 'Uw toegangspoort tot de wilde avonturen van Oeganda',
        'about-story': 'Ons verhaal',
        'about-story-text': 'Opgericht met een passie voor exploratie en een toewijding aan duurzaam toerisme, leidt Dragon Flys Expeditions sinds 2022 avonturiers naar de meest ongelooflijke bestemmingen ter wereld. We geloven dat reizen niet alleen spannend maar ook verantwoord en verrijkend moet zijn.',
        'about-mission': 'Onze missie',
        'about-mission-text': 'Onvergetelijke avontuurerervaringen bieden terwijl we milieubescherming en culturele waardering bevorderen. We streven ernaar reizigers te verbinden met authentieke lokale ervaringen en adembenemende natuurwonderen.',
        'destinations-title': 'Verken de nationale parken van Oeganda',
        'tours-title': 'Onze safari-tours en avonturen',
        'gallery-title': 'Galerij',
        'gallery-subtitle': 'Verken prachtige momenten van onze Oeganda safari-avonturen',
        'gallery-all': 'Alle Foto\'s',
        'gallery-gorillas': 'Gorilla Trekking',
        'gallery-wildlife': 'Wildlife',
        'gallery-landscapes': 'Landschappen',
        'gallery-cultural': 'Cultureel',
        'gallery-cta-title': 'Wil je Deze Momenten Beleven?',
        'gallery-cta-text': 'Sluit je aan bij ons voor je volgende Oeganda safari-avontuur',
        'gallery-cta-button': 'Bekijk Onze Tours',
        'videos-title': 'Klant Avontuur Video\'s',
        'videos-subtitle': 'Bekijk echte ervaringen van onze geweldige klanten over de hele wereld',
        'contact-title': 'Neem contact op',
        'footer-text': 'Dragon Flys Expeditions - Uw toegangspoort tot de wilde avonturen van Oeganda',
        'tagline': 'Oeganda Safari Avonturen',
        'hero-explore': 'Verken Tours',
        'hero-book': 'Boek nu',
        'murchison-title': 'Murchison Falls Avontuur',
        'murchison-desc': 'Aanschouw de krachtigste waterval ter wereld, spot schoenbekooievaars en ontmoet overvloedige wilde dieren',
        'queen-title': 'Queen Elizabeth Wildlife',
        'queen-desc': 'Ontmoet boomklimmende leeuwen en verken prachtige kratermeren',
        'kibale-title': 'Kibale Chimpansee Tracking',
        'kibale-desc': 'Volg chimpansees met de hoogste dichtheid in Oost-Afrika in ongerept regenwoud',
        'mburo-title': 'Lake Mburo Safari',
        'mburo-desc': 'Loop tussen zebra\'s en antilopen in dit unieke park',
        'bwindi-title': 'Bwindi Gorilla Trekking',
        'bwindi-desc': 'Ontmoetingen met berggorilla\'s op de UNESCO Werelderfgoedlocatie in ongerept regenwoud',
        'about-values': 'Onze waarden',
        'about-values-note': 'We pleiten actief voor natuurbehoudinitiatieven en verantwoord toerisme in partnerschap met lokale belanghebbenden en instellingen zoals de Uganda Wildlife Authority.',
        'conservation-heading': 'Onze inzet voor natuurbehoud',
        'about-testimonials': 'Wat onze avonturiers zeggen',
        'testimonial-1': 'Een absoluut ongelooflijke ervaring! De gidsen waren deskundig en de landschappen waren adembenemend. Ik kan niet wachten om mijn volgende avontuur te boeken!',
        'testimonial-2': 'Dragon Flys Expeditions overtrof alle verwachtingen. De aandacht voor detail en het engagement voor duurzaamheid maakten deze reis echt bijzonder.',
        'testimonial-3': 'Professioneel, veilig en ongelooflijk leuk! Het team zorgde ervoor dat we het avontuur van ons leven hadden terwijl we de lokale culturen respecteerden.',
        'tripadvisor-heading': 'Geverifieerde beoordelingen op TripAdvisor',
        'tripadvisor-desc': 'Sluit je aan bij duizenden tevreden avonturiers die hun authentieke Oeganda safari-ervaringen hebben gedeeld. Lees geverifieerde beoordelingen, bekijk echte foto\'s van onze tours, en ontdek waarom reizigers consequent Dragon Flys Expeditions kiezen voor hun Afrikaanse avonturen.',
        'recent-reviews': 'Recente geverifieerde beoordelingen',
        'read-more': 'Lees meer',
        'read-less': 'Lees minder',
        'review-1': 'Absoluut fenomenale ervaring met Dragon Flys Expeditions! De gorilla trekking in Bwindi was levensveranderend. Onze gids Baguma Daniel was ongelooflijk deskundig over wildlife en lokale cultuur. Zeer aanbevolen!',
        'review-2': 'De 13-daagse Oeganda safari overtrof alle verwachtingen. Van Murchison Falls tot Queen Elizabeth National Park, elke dag was een avontuur. De boomklimmende leeuwen in Ishasha waren geweldig! Professionele service doorheen.'
    },
    ch: {
        'nav-home': 'Startseite',
        'nav-about': 'Über uns',
        'nav-destinations': 'Reiseziele',
        'nav-tours': 'Touren',
        'nav-gallery': 'Galerie',
        'nav-contact': 'Kontakt',
        'nav-blog': 'Blog',
        'nav-faq': 'FAQ',
        'hero-title': 'Erleben Sie Ugandas wilde Schönheit',
        'hero-subtitle': 'Entdecken Sie die Perle Afrikas mit unseren expertengeführten Safari-Abenteuern',
        'book-now': 'Jetzt buchen',
        'learn-more': 'Mehr erfahren',
        'about-title': 'Über uns',
        'about-subtitle': 'Ihr Tor zu Ugandas wilden Abenteuern',
        'about-story': 'Unsere Geschichte',
        'about-story-text': 'Gegründet mit einer Leidenschaft für Erkundung und einem Engagement für nachhaltigen Tourismus, führt Dragon Flys Expeditions seit 2022 Abenteurer zu den unglaublichsten Zielen der Welt. Wir glauben, dass Reisen nicht nur aufregend, sondern auch verantwortungsvoll und bereichernd sein sollte.',
        'about-mission': 'Unsere Mission',
        'about-mission-text': 'Unvergessliche Abenteuererfahrungen zu bieten und gleichzeitig Umweltschutz und kulturelle Wertschätzung zu fördern. Wir bemühen uns, Reisende mit authentischen lokalen Erfahrungen und atemberaubenden Naturwundern zu verbinden.',
        'destinations-title': 'Erkunden Sie Ugandas Nationalparks',
        'tours-title': 'Unsere Safari-Touren und Abenteuer',
        'gallery-title': 'Galerie',
        'gallery-subtitle': 'Erkunden Sie atemberaubende Momente aus unseren Uganda-Safari-Abenteuern',
        'gallery-all': 'Alle Fotos',
        'gallery-gorillas': 'Gorilla Trekking',
        'gallery-wildlife': 'Wildtiere',
        'gallery-landscapes': 'Landschaften',
        'gallery-cultural': 'Kulturell',
        'gallery-cta-title': 'Möchten Sie Diese Momente Erleben?',
        'gallery-cta-text': 'Begleiten Sie uns auf Ihrem nächsten Uganda-Safari-Abenteuer',
        'gallery-cta-button': 'Unsere Touren Ansehen',
        'videos-title': 'Kunden-Abenteuer-Videos',
        'videos-subtitle': 'Sehen Sie echte Erfahrungen unserer erstaunlichen Kunden aus der ganzen Welt',
        'contact-title': 'Kontaktieren Sie uns',
        'footer-text': 'Dragon Flys Expeditions - Ihr Tor zu Ugandas wilden Abenteuern',
        'tagline': 'Uganda Safari Abenteuer',
        'hero-explore': 'Touren erkunden',
        'hero-book': 'Jetzt buchen',
        'murchison-title': 'Murchison Falls Abenteuer',
        'murchison-desc': 'Erleben Sie den mächtigsten Wasserfall der Welt, entdecken Sie Schuhschnabelstörche und begegnen Sie reichhaltiger Tierwelt',
        'queen-title': 'Queen Elizabeth Tierwelt',
        'queen-desc': 'Begegnen Sie kletternden Löwen und erkunden Sie atemberaubende Kraterseen',
        'kibale-title': 'Kibale Schimpansen-Tracking',
        'kibale-desc': 'Verfolgen Sie Schimpansen mit der höchsten Dichte in Ostafrika im unberührten Regenwald',
        'mburo-title': 'Lake Mburo Safari',
        'mburo-desc': 'Spazieren Sie zwischen Zebras und Antilopen in diesem einzigartigen Park',
        'bwindi-title': 'Bwindi Gorilla Trekking',
        'bwindi-desc': 'Begegnungen mit Berggorillas im UNESCO-Weltkulturerbe in unberührtem Regenwald',
        'about-values': 'Unsere Werte',
        'about-values-note': 'Wir setzen uns aktiv für Naturschutzinitiativen und verantwortungsvollen Tourismus in Partnerschaft mit lokalen Interessengruppen und Institutionen wie der Uganda Wildlife Authority ein.',
        'conservation-heading': 'Unser Engagement für den Naturschutz',
        'about-testimonials': 'Was unsere Abenteurer sagen',
        'testimonial-1': 'Ein absolut unglaubliches Erlebnis! Die Führer waren sachkundig und die Landschaften atemberaubend. Ich kann es kaum erwarten, mein nächstes Abenteuer zu buchen!',
        'testimonial-2': 'Dragon Flys Expeditions übertraf alle Erwartungen. Die Aufmerksamkeit für Details und das Engagement für Nachhaltigkeit machten diese Reise wirklich besonders.',
        'testimonial-3': 'Professionell, sicher und unglaublich spaßig! Das Team sorgte dafür, dass wir das Abenteuer unseres Lebens hatten und dabei die lokalen Kulturen respektierten.',
        'tripadvisor-heading': 'Verifizierte Bewertungen auf TripAdvisor',
        'tripadvisor-desc': 'Schließen Sie sich Tausenden von zufriedenen Abenteurern an, die ihre authentischen Uganda-Safari-Erfahrungen geteilt haben. Lesen Sie verifizierte Bewertungen, sehen Sie echte Fotos von unseren Touren und entdecken Sie, warum Reisende konsequent Dragon Flys Expeditions für ihre afrikanischen Abenteuer wählen.',
        'recent-reviews': 'Aktuelle verifizierte Bewertungen',
        'read-more': 'Mehr lesen',
        'read-less': 'Weniger lesen',
        'review-1': 'Absolut phänomenale Erfahrung mit Dragon Flys Expeditions! Das Gorilla-Trekking in Bwindi war lebensverändernd. Unser Führer Baguma Daniel war unglaublich sachkundig über Wildtiere und lokale Kultur. Sehr empfehlenswert!',
        'review-2': 'Die 13-tägige Uganda-Safari übertraf alle Erwartungen. Von den Murchison Falls bis zum Queen Elizabeth National Park war jeder Tag ein Abenteuer. Die baumkletternden Löwen in Ishasha waren erstaunlich! Professioneller Service während der gesamten Zeit.'
    }
};

// Expose translations globally for components that rely on currentLanguage
try {
    window.translations = translations;
} catch (e) {
    // Non-browser context fallback – ignore
}

function translatePage(lang) {
    if (!translations[lang]) return;
    
        currentLanguage = lang;
    
    // Update data-translate elements
    const elements = document.querySelectorAll('[data-translate]');
    elements.forEach(element => {
        const key = element.getAttribute('data-translate');
        if (translations[lang][key]) {
            element.textContent = translations[lang][key];
        }
    });
    
    // Update data-translate-placeholder elements
    const placeholderElements = document.querySelectorAll('[data-translate-placeholder]');
    placeholderElements.forEach(element => {
        const key = element.getAttribute('data-translate-placeholder');
        if (translations[lang][key]) {
            element.placeholder = translations[lang][key];
        }
    });
    
    // Update language switcher UI
    const currentLangText = document.querySelector('.current-lang-text');
    if (currentLangText) {
        currentLangText.textContent = lang.toUpperCase();
    }
    
    // Update aria-selected attributes
    const languageOptions = document.querySelectorAll('.language-option');
    languageOptions.forEach(option => {
        if (option.getAttribute('data-lang') === lang) {
            option.setAttribute('aria-selected', 'true');
            option.classList.add('active');
        } else {
            option.setAttribute('aria-selected', 'false');
            option.classList.remove('active');
        }
    });

    // Notify components about language change
    try {
        document.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
    } catch (e) {
        console.warn('languageChanged dispatch failed', e);
    }
}

function initializeLanguageSwitcher() {
    const languageSwitcher = document.querySelector('.language-switcher');
    if (!languageSwitcher) return;
    
        const currentLanguageBtn = document.querySelector('.current-language');
        const languageOptions = document.querySelectorAll('.language-option');
    const languageDropdown = document.querySelector('.language-dropdown');
    
    if (!currentLanguageBtn || !languageDropdown) return;
    
    // Ensure parent container has relative positioning
    languageSwitcher.style.position = 'relative';
    
    // Ensure dropdown is initially hidden and properly styled
    languageDropdown.style.display = 'none';
    languageDropdown.style.position = 'absolute';
    languageDropdown.style.top = '100%';
    languageDropdown.style.right = '0';
    languageDropdown.style.backgroundColor = '#ffffff';
    languageDropdown.style.border = '2px solid #ff6b35';
    languageDropdown.style.borderRadius = '8px';
    languageDropdown.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
    languageDropdown.style.zIndex = '9999';
    languageDropdown.style.minWidth = '150px';
    languageDropdown.style.padding = '10px';
    languageDropdown.style.marginTop = '5px';
    // Force visibility
    languageDropdown.style.visibility = 'visible';
    languageDropdown.style.opacity = '1';
    
    // Toggle dropdown
    function toggleDropdown() {
        const isOpen = languageDropdown.classList.contains('show');
        if (isOpen) {
            languageDropdown.classList.remove('show');
            languageDropdown.style.display = 'none';
            languageDropdown.setAttribute('aria-expanded', 'false');
        } else {
            languageDropdown.classList.add('show');
            languageDropdown.style.display = 'block';
            languageDropdown.setAttribute('aria-expanded', 'true');
        }
    }
    
    // Close dropdown
    function closeDropdown() {
        languageDropdown.classList.remove('show');
        languageDropdown.style.display = 'none';
        languageDropdown.setAttribute('aria-expanded', 'false');
    }

        // Event listeners
    currentLanguageBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        toggleDropdown();
    });
    
    // Language option clicks
    languageOptions.forEach(option => {
        option.addEventListener('click', (e) => {
            e.stopPropagation();
            const lang = option.getAttribute('data-lang');
            if (lang && translations[lang]) {
                translatePage(lang);
                closeDropdown();
            }
        });
    });

    // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
        if (!languageSwitcher.contains(e.target)) {
            closeDropdown();
        }
    });
    
    // Keyboard navigation
    currentLanguageBtn.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
            toggleDropdown();
        } else if (e.key === 'Escape') {
            closeDropdown();
        }
    });
    
    // Initialize with English
    translatePage('en');
}

// Initialize language switcher when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeLanguageSwitcher);
} else {
    initializeLanguageSwitcher();
}

// Mobile Hamburger Menu Functionality
let isMenuOpen = false;

function initializeMobileMenu() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    const body = document.body;
    
    if (!hamburger || !navMenu) return;
    
    // Toggle menu function
    function toggleMenu() {
        isMenuOpen = !isMenuOpen;
        
        if (isMenuOpen) {
            // Open menu
            hamburger.classList.add('active');
            navMenu.classList.add('active');
            body.style.overflow = 'hidden'; // Prevent background scrolling
            
            // Force visibility for all menu items
            const allMenuItems = navMenu.querySelectorAll('li');
            allMenuItems.forEach(item => {
                item.style.display = 'block';
                item.style.visibility = 'visible';
                item.style.opacity = '1';
            });
            
        } else {
            // Close menu
            hamburger.classList.remove('active');
            navMenu.classList.remove('active');
            body.style.overflow = ''; // Restore scrolling
        }
    }
    
    // Event listeners
    hamburger.addEventListener('click', toggleMenu);
    
    // Close menu when clicking on nav links
    const navLinks = navMenu.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (isMenuOpen) {
                toggleMenu();
            }
        });
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (isMenuOpen && !navMenu.contains(e.target) && !hamburger.contains(e.target)) {
            toggleMenu();
        }
    });
    
    // Close menu on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isMenuOpen) {
            toggleMenu();
        }
    });
    
    // Close menu on window resize to desktop
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768 && isMenuOpen) {
            toggleMenu();
        }
    });
}

// Initialize mobile menu when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeMobileMenu);
} else {
    initializeMobileMenu();
}

// View More functionality for Destinations
function toggleDestinationsView() {
    const button = document.getElementById('destinations-view-more');
    const grid = document.getElementById('destinations-grid');
    
    if (!button || !grid) return;
    
    const isExpanded = button.getAttribute('aria-expanded') === 'true';
    
    if (isExpanded) {
        // Collapse - show only first 3 items
        const items = grid.querySelectorAll('.destination-card');
        items.forEach((item, index) => {
            if (index >= 3) {
                item.classList.add('hidden');
                item.style.display = 'none';
            }
        });
        button.textContent = 'View More';
        button.setAttribute('aria-expanded', 'false');
    } else {
        // Expand - show all items
        const items = grid.querySelectorAll('.destination-card');
        items.forEach(item => {
            item.classList.remove('hidden');
            item.style.display = 'block';
            item.style.visibility = 'visible';
            item.style.opacity = '1';
        });
        button.textContent = 'View Less';
        button.setAttribute('aria-expanded', 'true');
    }
}

// Make function globally accessible for inline onclick
window.toggleDestinationsView = toggleDestinationsView;

// Dropdown Destinations Selector functionality
function showSelectedDestination(selectedValue) {
    const selectedDestinationDiv = document.getElementById('selected-destination');
    const destinationData = document.querySelector('.destination-data');
    
    if (!selectedDestinationDiv || !destinationData) return;
    
    if (!selectedValue) {
        // Hide the selected destination display if no option is selected
        selectedDestinationDiv.style.display = 'none';
        return;
    }
    
    // Find the destination data
    const destinationElement = destinationData.querySelector(`[data-destination="${selectedValue}"]`);
    
    if (!destinationElement) {
        console.error('Destination data not found for:', selectedValue);
        return;
    }
    
    // Get the data
    const image = destinationElement.getAttribute('data-image');
    const alt = destinationElement.getAttribute('data-alt');
    const title = destinationElement.querySelector('h3').textContent;
    const description = destinationElement.querySelector('p').textContent;
    const highlights = destinationElement.querySelector('.highlights');
    
    // Create the destination card HTML
    let highlightsHTML = '';
    if (highlights) {
        const highlightSpans = highlights.querySelectorAll('span');
        highlightsHTML = '<div class="highlights">';
        highlightSpans.forEach(span => {
            highlightsHTML += `<span>${span.textContent}</span>`;
        });
        highlightsHTML += '</div>';
    }
    
    // Populate the selected destination display
    selectedDestinationDiv.innerHTML = `
        <div class="destination-card selected">
            <img src="${image}" alt="${alt}" loading="lazy">
            <div class="destination-content">
                <h3>${title}</h3>
                <p>${description}</p>
                ${highlightsHTML}
                <div class="destination-actions">
                    <a href="#tours" class="cta-button">View Tours</a>
                    <a href="#contact" class="cta-button-outline">Get Quote</a>
                </div>
            </div>
        </div>
    `;
    
    // Show the selected destination with smooth animation
    selectedDestinationDiv.style.display = 'block';
    selectedDestinationDiv.style.opacity = '0';
    selectedDestinationDiv.style.transform = 'translateY(20px)';
    
    // Animate in
    setTimeout(() => {
        selectedDestinationDiv.style.transition = 'all 0.3s ease';
        selectedDestinationDiv.style.opacity = '1';
        selectedDestinationDiv.style.transform = 'translateY(0)';
    }, 10);
    
    // Smooth scroll to the selected destination
    setTimeout(() => {
        selectedDestinationDiv.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    }, 100);
}

// Make function globally accessible for inline onchange
window.showSelectedDestination = showSelectedDestination;

// Dropdown Tours Selector functionality
function showSelectedTour(selectedValue) {
    const selectedTourDiv = document.getElementById('selected-tour');
    const tourData = document.querySelector('.tour-data');
    
    if (!selectedTourDiv || !tourData) return;
    
    if (!selectedValue) {
        // Hide the selected tour display if no option is selected
        selectedTourDiv.style.display = 'none';
        return;
    }
    
    // Find the tour data
    const tourElement = tourData.querySelector(`[data-tour="${selectedValue}"]`);
    
    if (!tourElement) {
        console.error('Tour data not found for:', selectedValue);
        return;
    }
    
    // Get the data
    const image = tourElement.getAttribute('data-image');
    const alt = tourElement.getAttribute('data-alt');
    const title = tourElement.querySelector('h3').textContent;
    const tourType = tourElement.querySelector('.tour-type').textContent;
    const duration = tourElement.querySelector('.tour-duration').innerHTML;
    const price = tourElement.querySelector('.tour-price').textContent;
    const highlights = tourElement.querySelector('.tour-highlights');
    const itinerary = tourElement.querySelector('.tour-itinerary');
    
    // Create the highlights HTML
    let highlightsHTML = '';
    if (highlights) {
        const highlightSpans = highlights.querySelectorAll('span');
        highlightsHTML = '<div class="tour-highlights">';
        highlightSpans.forEach(span => {
            highlightsHTML += `<span>${span.textContent}</span>`;
        });
        highlightsHTML += '</div>';
    }
    
    // Create the itinerary HTML
    let itineraryHTML = '';
    if (itinerary) {
        itineraryHTML = itinerary.outerHTML;
    }
    
    // Populate the selected tour display
    selectedTourDiv.innerHTML = `
        <div class="tour-card selected">
            <img src="${image}" alt="${alt}" loading="lazy">
            <div class="tour-content">
                <h3>${title}</h3>
                <p class="tour-type">${tourType}</p>
                <p class="tour-duration">${duration}</p>
                <p class="tour-price">${price}</p>
                ${highlightsHTML}
                ${itineraryHTML}
                <div class="tour-actions">
                    <button class="cta-button" onclick="toggleItinerary(this)" aria-expanded="false">View Details</button>
                    <button class="cta-button-outline book-btn">Book Now</button>
                </div>
            </div>
        </div>
    `;
    
    // Show the selected tour with smooth animation
    selectedTourDiv.style.display = 'block';
    selectedTourDiv.style.opacity = '0';
    selectedTourDiv.style.transform = 'translateY(20px)';
    
    // Animate in
    setTimeout(() => {
        selectedTourDiv.style.transition = 'all 0.3s ease';
        selectedTourDiv.style.opacity = '1';
        selectedTourDiv.style.transform = 'translateY(0)';
    }, 10);
    
    // Smooth scroll to the selected tour
    setTimeout(() => {
        selectedTourDiv.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    }, 100);
}

// Make function globally accessible for inline onchange
window.showSelectedTour = showSelectedTour;

// Dropdown Guides Selector functionality
function showSelectedGuide(selectedValue) {
    const selectedGuideDiv = document.getElementById('selected-guide');
    const guideData = document.querySelector('.guide-data');
    
    if (!selectedGuideDiv || !guideData) return;
    
    if (!selectedValue) {
        // Hide the selected guide display if no option is selected
        selectedGuideDiv.style.display = 'none';
        return;
    }
    
    // Find the guide data
    const guideElement = guideData.querySelector(`[data-guide="${selectedValue}"]`);
    
    if (!guideElement) {
        console.error('Guide data not found for:', selectedValue);
        return;
    }
    
    // Get the data
    const image = guideElement.getAttribute('data-image');
    const alt = guideElement.getAttribute('data-alt');
    const name = guideElement.querySelector('h4').textContent;
    const role = guideElement.querySelector('.guide-role').textContent;
    const description = guideElement.querySelector('.guide-description').textContent;
    const specialties = guideElement.querySelector('.guide-specialties');
    const overlay = guideElement.querySelector('.guide-overlay');
    
    // Create the specialties HTML
    let specialtiesHTML = '';
    if (specialties) {
        const specialtySpans = specialties.querySelectorAll('span');
        specialtiesHTML = '<div class="guide-specialties">';
        specialtySpans.forEach(span => {
            specialtiesHTML += `<span>${span.textContent}</span>`;
        });
        specialtiesHTML += '</div>';
    }
    
    // Create the overlay HTML
    let overlayHTML = '';
    if (overlay) {
        const overlayTitle = overlay.querySelector('h3').textContent;
        const overlaySubtitle = overlay.querySelector('p').textContent;
        overlayHTML = `
            <div class="guide-overlay">
                <h3>${overlayTitle}</h3>
                <p>${overlaySubtitle}</p>
            </div>
        `;
    }
    
    // Create dynamic action button text based on guide
    let actionButtonText = 'Book Now';
    if (selectedValue === 'daniel') {
        actionButtonText = 'Book with Daniel';
    } else if (selectedValue === 'fred') {
        actionButtonText = 'Book with Fred';
    } else if (selectedValue === 'joan') {
        actionButtonText = 'Book with Joan';
    } else if (selectedValue === 'mary') {
        actionButtonText = 'Contact Mary';
    } else if (selectedValue === 'team' || selectedValue === 'action') {
        actionButtonText = 'Book with Team';
    }
    
    // Populate the selected guide display
    selectedGuideDiv.innerHTML = `
        <div class="guide-card selected">
            <div class="guide-image">
                <img src="${image}" alt="${alt}" loading="lazy">
                ${overlayHTML}
            </div>
            <div class="guide-content">
                <h4>${name}</h4>
                <p class="guide-role">${role}</p>
                <p class="guide-description">${description}</p>
                ${specialtiesHTML}
                <div class="guide-actions">
                    <a href="#tours" class="cta-button">${actionButtonText}</a>
                    <a href="#contact" class="cta-button-outline">Contact Us</a>
                </div>
            </div>
        </div>
    `;
    
    // Show the selected guide with smooth animation
    selectedGuideDiv.style.display = 'block';
    selectedGuideDiv.style.opacity = '0';
    selectedGuideDiv.style.transform = 'translateY(20px)';
    
    // Animate in
    setTimeout(() => {
        selectedGuideDiv.style.transition = 'all 0.3s ease';
        selectedGuideDiv.style.opacity = '1';
        selectedGuideDiv.style.transform = 'translateY(0)';
    }, 10);
    
    // Smooth scroll to the selected guide
    setTimeout(() => {
        selectedGuideDiv.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    }, 100);
}

// Make function globally accessible for inline onchange
window.showSelectedGuide = showSelectedGuide;

// View More functionality for Videos
function toggleVideosView() {
    const button = document.getElementById('videos-view-more');
    const grid = document.getElementById('videos-grid');
    
    if (!button || !grid) return;
    
    const isExpanded = button.getAttribute('aria-expanded') === 'true';
    
    if (isExpanded) {
        // Collapse - show only first 3 items
        const items = grid.querySelectorAll('.video-card');
        items.forEach((item, index) => {
            if (index >= 3) {
                item.classList.add('hidden');
                item.style.display = 'none';
            }
        });
        button.textContent = 'View More';
        button.setAttribute('aria-expanded', 'false');
    } else {
        // Expand - show all items
        const items = grid.querySelectorAll('.video-card');
        items.forEach(item => {
            item.classList.remove('hidden');
            item.style.display = 'block';
            item.style.visibility = 'visible';
            item.style.opacity = '1';
        });
        button.textContent = 'View Less';
        button.setAttribute('aria-expanded', 'true');
    }
}

// Make function globally accessible for inline onclick
window.toggleVideosView = toggleVideosView;

// ========================================
// FAQ ACCORDION FUNCTIONALITY
// ========================================

function initializeFAQ() {
    console.log('🔍 Initializing FAQ accordion...');
    const faqItems = document.querySelectorAll('.faq-item');
    
    if (!faqItems.length) {
        console.log('❌ No FAQ items found');
        return;
    }
    
    console.log(`✅ Found ${faqItems.length} FAQ items`);
    
    faqItems.forEach((item, index) => {
        const question = item.querySelector('.faq-question');
        const answer = item.querySelector('.faq-answer');
        const icon = item.querySelector('.faq-question i');
        
        if (!question || !answer) return;
        
        // Set initial state - all collapsed
        answer.style.display = 'none';
        answer.style.maxHeight = '0';
        answer.style.overflow = 'hidden';
        answer.style.transition = 'max-height 0.3s ease';
        
        // Add click handler
        question.addEventListener('click', () => {
            const isOpen = answer.style.display === 'block';
            
            if (isOpen) {
                // Close this FAQ
                answer.style.maxHeight = '0';
                setTimeout(() => {
                    answer.style.display = 'none';
                }, 300);
                if (icon) {
                    icon.style.transform = 'rotate(0deg)';
                }
                question.setAttribute('aria-expanded', 'false');
            } else {
                // Close all other FAQs first (optional - remove if you want multiple open)
                faqItems.forEach(otherItem => {
                    if (otherItem !== item) {
                        const otherAnswer = otherItem.querySelector('.faq-answer');
                        const otherIcon = otherItem.querySelector('.faq-question i');
                        const otherQuestion = otherItem.querySelector('.faq-question');
                        if (otherAnswer) {
                            otherAnswer.style.maxHeight = '0';
                            setTimeout(() => {
                                otherAnswer.style.display = 'none';
                            }, 300);
                        }
                        if (otherIcon) {
                            otherIcon.style.transform = 'rotate(0deg)';
                        }
                        if (otherQuestion) {
                            otherQuestion.setAttribute('aria-expanded', 'false');
                        }
                    }
                });
                
                // Open this FAQ
                answer.style.display = 'block';
                answer.style.maxHeight = answer.scrollHeight + 'px';
                if (icon) {
                    icon.style.transform = 'rotate(180deg)';
                    icon.style.transition = 'transform 0.3s ease';
                }
                question.setAttribute('aria-expanded', 'true');
            }
        });
        
        // Add keyboard support
        question.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                question.click();
            }
        });
        
        // Make focusable
        question.setAttribute('tabindex', '0');
        question.setAttribute('role', 'button');
        question.setAttribute('aria-expanded', 'false');
        
        // Style the question for better UX
        question.style.cursor = 'pointer';
        question.style.userSelect = 'none';
        
        // Add hover effect
        question.addEventListener('mouseenter', () => {
            question.style.backgroundColor = 'rgba(0, 170, 108, 0.05)';
        });
        question.addEventListener('mouseleave', () => {
            question.style.backgroundColor = 'transparent';
        });
    });
    
    console.log('✅ FAQ accordion initialized');
}

// Initialize FAQ when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeFAQ);
} else {
    initializeFAQ();
}

// View More functionality for Gallery
function toggleGalleryView() {
    const button = document.getElementById('gallery-view-more');
    const grid = document.querySelector('.gallery-grid');
    
    if (!button || !grid) return;
    
    const isExpanded = button.getAttribute('aria-expanded') === 'true';
    
    if (isExpanded) {
        // Collapse - hide items beyond the first 12 (show 2 rows of 6)
        const items = grid.querySelectorAll('.gallery-item');
        items.forEach((item, index) => {
            if (index >= 12) {
                item.classList.add('hidden');
            }
        });
        button.textContent = 'View More';
        button.setAttribute('aria-expanded', 'false');
    } else {
        // Expand - show all items (remove all hidden classes)
        const items = grid.querySelectorAll('.gallery-item');
        items.forEach(item => {
            item.classList.remove('hidden');
        });
        button.textContent = 'View Less';
        button.setAttribute('aria-expanded', 'true');
    }
}

// Gallery filter functionality
function initializeGalleryFilters() {
    const filterButtons = document.querySelectorAll('.gallery-filters .filter-btn');
    const galleryItems = document.querySelectorAll('.gallery-item');
    
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            const filter = this.getAttribute('data-filter');
            
            // Update active button
            filterButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            // Filter gallery items
            galleryItems.forEach(item => {
                const category = item.getAttribute('data-category');
                if (filter === 'all' || category === filter) {
                    item.style.display = 'block';
                } else {
                    item.style.display = 'none';
                }
            });
            
            // Reset view more button state after filtering
            const viewMoreButton = document.getElementById('gallery-view-more');
            if (viewMoreButton) {
                viewMoreButton.setAttribute('aria-expanded', 'false');
                viewMoreButton.textContent = 'View More';
            }
        });
    });
}

// Initialize View More buttons when DOM is ready
function initializeViewMore() {
    console.log('🔍 Initializing View More buttons...');
    const destinationsButton = document.getElementById('destinations-view-more');
    const galleryButton = document.getElementById('gallery-view-more');
    
    console.log('Destinations button found:', !!destinationsButton);
    console.log('Gallery button found:', !!galleryButton);
    
    // Test if the function is accessible globally
    if (typeof toggleDestinationsView === 'function') {
        console.log('✅ toggleDestinationsView function is accessible');
        window.toggleDestinationsView = toggleDestinationsView; // Make sure it's global
    } else {
        console.log('❌ toggleDestinationsView function not accessible');
    }
    
    // Destinations button uses inline onclick, no need for event listener
    
    if (galleryButton) {
        galleryButton.addEventListener('click', toggleGalleryView);
        
        // Initialize gallery to show only first 12 items (2 rows of 6)
        const galleryGrid = document.querySelector('.gallery-grid');
        if (galleryGrid) {
            const items = galleryGrid.querySelectorAll('.gallery-item');
            items.forEach((item, index) => {
                if (index >= 12) {
                    item.classList.add('hidden');
                }
            });
        }
    }
    
    // Initialize gallery filters
    initializeGalleryFilters();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeViewMore);
} else {
    initializeViewMore();
}

// ========================================
// REVIEWS (TRIPADVISOR) INTERACTIVITY
// ========================================

// Submit review to Google Form (no-backend persistence)
function submitToGoogleForm(section, review) {
    try {
        const url = section.dataset.gformUrl;
        if (!url) return;
        const map = {
            rating: section.dataset.gformRating,
            name: section.dataset.gformName,
            email: section.dataset.gformEmail,
            title: section.dataset.gformTitle,
            text: section.dataset.gformText,
            consent: section.dataset.gformConsent
        };
        if (!map.rating || !map.name || !map.text) {
            console.warn('Google Form mapping missing required entries. Provide data-gform-rating, data-gform-name, data-gform-text.');
            return;
        }
        const iframe = document.createElement('iframe');
        iframe.name = 'gform_iframe_' + Date.now();
        iframe.style.display = 'none';
        document.body.appendChild(iframe);

        const form = document.createElement('form');
        form.method = 'POST';
        form.action = url;
        form.target = iframe.name;

        function add(name, value) {
            if (!name) return;
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = name;
            input.value = String(value || '');
            form.appendChild(input);
        }
        add(map.rating, review.rating);
        add(map.name, review.name);
        add(map.email, review.email);
        add(map.title, review.title);
        add(map.text, review.text);
        add(map.consent, 'Yes');

        document.body.appendChild(form);
        form.submit();
        setTimeout(() => { form.remove(); iframe.remove(); }, 4000);
    } catch (e) {
        console.warn('Failed to submit to Google Form', e);
    }
}

function initializeReviews() {
    console.log('🔍 Initializing reviews...');
    const section = document.querySelector('.tripadvisor-section');
    if (!section) {
        console.log('❌ Reviews section not found');
        return;
    }
    console.log('✅ Reviews section found:', section);
    const cardsContainer = section.querySelector('.review-cards');
    if (!cardsContainer) return;
    const cards = Array.from(cardsContainer.querySelectorAll('.review-card'));
    
    // Translation helper for this section
    function t(key) {
        try {
            if (window.translations && window.translations[currentLanguage] && window.translations[currentLanguage][key]) {
                return window.translations[currentLanguage][key];
            }
            if (window.translations && window.translations.en && window.translations.en[key]) {
                return window.translations.en[key];
            }
        } catch (e) {
            // ignore
        }
        return key;
    }
    
    function parseRating(card) {
        const starsEl = card.querySelector('.stars');
        if (!starsEl) return 0;
        const text = (starsEl.textContent || '').trim();
        const filled = (text.match(/★/g) || []).length;
        const fallback = parseInt(starsEl.getAttribute('data-rating') || '0', 10) || 0;
        return filled || fallback;
    }
    
    function parseRelativeDate(str) {
        const now = new Date();
        const s = String(str || '').toLowerCase().trim();
        const m = s.match(/(\d+)\s*(day|days|week|weeks|month|months|year|years)/);
        if (m) {
            const num = parseInt(m[1], 10);
            const unit = m[2];
            const d = new Date(now);
            if (unit.startsWith('day')) d.setDate(now.getDate() - num);
            else if (unit.startsWith('week')) d.setDate(now.getDate() - num * 7);
            else if (unit.startsWith('month')) d.setMonth(now.getMonth() - num);
            else if (unit.startsWith('year')) d.setFullYear(now.getFullYear() - num);
            return d.getTime();
        }
        const t = Date.parse(s);
        return isNaN(t) ? 0 : t;
    }
    
    // Precompute metadata
    cards.forEach((card, idx) => {
        const dateEl = card.querySelector('.review-date');
        const ts = parseRelativeDate(dateEl ? dateEl.textContent : '');
        const rating = parseRating(card);
        card.dataset.timestamp = String(ts);
        card.dataset.rating = String(rating);
        card.dataset.index = String(idx);
    });

    // Read More/Less clamping
    function setupCardReadMore(card) {
        const textEl = card.querySelector('p');
        if (!textEl) return;
        textEl.classList.add('review-text');
        const needsClamp = (textEl.textContent || '').trim().length > 200;
        if (needsClamp) {
            textEl.classList.add('clamped');
            // Add toggle button
            let toggle = card.querySelector('.read-more-toggle');
            if (!toggle) {
                toggle = document.createElement('button');
                toggle.className = 'read-more-toggle';
                toggle.type = 'button';
                toggle.setAttribute('aria-expanded', 'false');
                toggle.textContent = t('read-more');
                textEl.insertAdjacentElement('afterend', toggle);
                toggle.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const clamped = textEl.classList.toggle('clamped');
                    toggle.textContent = clamped ? t('read-more') : t('read-less');
                    toggle.setAttribute('aria-expanded', String(!clamped));
                });
            }
        }
    }

    function updateToggleLabelsForLanguage() {
        const toggles = section.querySelectorAll('.review-card .read-more-toggle');
        toggles.forEach(toggle => {
            const card = toggle.closest('.review-card');
            if (!card) return;
            const textEl = card.querySelector('.review-text');
            const clamped = textEl ? textEl.classList.contains('clamped') : true;
            toggle.textContent = clamped ? t('read-more') : t('read-less');
        });
    }

    function openReviewModal(card) {
        // Build modal
        const overlay = document.createElement('div');
        overlay.className = 'review-modal';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');

        const content = document.createElement('div');
        content.className = 'review-modal-content';

        const header = document.createElement('div');
        header.className = 'review-modal-header';
        const title = document.createElement('h3');
        title.textContent = 'Full Review';
        const closeBtn = document.createElement('button');
        closeBtn.className = 'close-modal';
        closeBtn.setAttribute('aria-label', 'Close');
        closeBtn.innerHTML = '&times;';
        header.appendChild(title);
        header.appendChild(closeBtn);

        const body = document.createElement('div');
        body.className = 'review-modal-body';

        const starsRow = document.createElement('div');
        starsRow.className = 'review-modal-stars';
        const stars = document.createElement('div');
        stars.className = 'stars';
        const cardStars = card.querySelector('.stars');
        stars.textContent = cardStars ? (cardStars.textContent || '').trim() : '★★★★★';
        const date = document.createElement('div');
        date.className = 'review-modal-date';
        const cardDate = card.querySelector('.review-date');
        date.textContent = cardDate ? (cardDate.textContent || '').trim() : '';
        starsRow.appendChild(stars);
        starsRow.appendChild(date);

        const textWrap = document.createElement('div');
        textWrap.className = 'review-modal-text';
        const p = document.createElement('p');
        const cardText = card.querySelector('p');
        p.textContent = cardText ? (cardText.textContent || '').trim() : '';
        textWrap.appendChild(p);

        const authorRow = document.createElement('div');
        authorRow.className = 'review-modal-author';
        const authorIcon = document.createElement('i');
        authorIcon.className = 'fas fa-user-circle';
        const authorSpan = document.createElement('span');
        const cardAuthor = card.querySelector('.review-author span');
        authorSpan.textContent = cardAuthor ? (cardAuthor.textContent || '').trim() : '';
        authorRow.appendChild(authorIcon);
        authorRow.appendChild(authorSpan);

        const tripRow = document.createElement('div');
        tripRow.className = 'review-modal-trip';
        const tripIcon = document.createElement('i');
        tripIcon.className = 'fas fa-map-marker-alt';
        const tripSpan = document.createElement('span');
        const cardTrip = card.querySelector('.review-trip span');
        tripSpan.textContent = cardTrip ? (cardTrip.textContent || '').trim() : '';
        tripRow.appendChild(tripIcon);
        tripRow.appendChild(tripSpan);

        const actions = document.createElement('div');
        actions.className = 'review-modal-actions';
        const closeAction = document.createElement('button');
        closeAction.className = 'tripadvisor-btn secondary';
        closeAction.type = 'button';
        closeAction.textContent = 'Close';
        actions.appendChild(closeAction);

        body.appendChild(starsRow);
        body.appendChild(textWrap);
        if (authorSpan.textContent) body.appendChild(authorRow);
        if (tripSpan.textContent) body.appendChild(tripRow);
        body.appendChild(actions);

        content.appendChild(header);
        content.appendChild(body);
        overlay.appendChild(content);
        document.body.appendChild(overlay);

        function close() {
            document.removeEventListener('keydown', onKey);
            overlay.removeEventListener('click', onOverlay);
            overlay.remove();
        }
        function onKey(e) {
            if (e.key === 'Escape') close();
        }
        function onOverlay(e) {
            if (e.target === overlay) close();
        }
        closeBtn.addEventListener('click', close);
        closeAction.addEventListener('click', close);
        overlay.addEventListener('click', onOverlay);
        document.addEventListener('keydown', onKey);
        // Focus for accessibility
        setTimeout(() => closeBtn.focus(), 0);
    }

    // Onsite Review Form Modal
    function openReviewFormModal() {
        console.log('🚀 openReviewFormModal() called');
        const overlay = document.createElement('div');
        overlay.className = 'review-modal';
        overlay.id = 'reviewFormModal';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        // Force visibility with inline styles
        overlay.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            background: rgba(0, 0, 0, 0.8) !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            z-index: 10000 !important;
        `;

        const content = document.createElement('div');
        content.className = 'review-modal-content';
        // Force content visibility
        content.style.cssText = `
            background: white !important;
            border-radius: 20px !important;
            width: 90% !important;
            max-width: 500px !important;
            max-height: 90vh !important;
            overflow-y: auto !important;
            position: relative !important;
        `;

        const header = document.createElement('div');
        header.className = 'review-modal-header';
        const title = document.createElement('h3');
        title.textContent = 'Submit a Review';
        const closeBtn = document.createElement('button');
        closeBtn.className = 'close-modal';
        closeBtn.setAttribute('aria-label', 'Close');
        closeBtn.innerHTML = '&times;';
        header.appendChild(title);
        header.appendChild(closeBtn);

        const body = document.createElement('div');
        body.className = 'review-modal-body';

        const form = document.createElement('div');
        form.className = 'review-form';

        // Rating
        const groupRating = document.createElement('div');
        groupRating.className = 'form-group';
        const labelRating = document.createElement('label');
        labelRating.textContent = 'Rating';
        const starsSelect = document.createElement('div');
        starsSelect.className = 'stars-select';
        starsSelect.setAttribute('role', 'radiogroup');
        let selectedRating = 0;
        for (let i = 1; i <= 5; i++) {
            const star = document.createElement('span');
            star.className = 'star';
            star.textContent = '★';
            star.setAttribute('data-value', String(i));
            star.setAttribute('role', 'radio');
            star.setAttribute('aria-checked', 'false');
            star.addEventListener('click', () => {
                selectedRating = i;
                starsSelect.querySelectorAll('.star').forEach(s => {
                    const val = parseInt(s.getAttribute('data-value') || '0', 10);
                    s.classList.toggle('active', val <= selectedRating);
                    s.setAttribute('aria-checked', String(val === selectedRating));
                });
            });
            starsSelect.appendChild(star);
        }
        const ratingError = document.createElement('div');
        ratingError.className = 'error-text';
        ratingError.style.display = 'none';
        form.appendChild(groupRating);
        groupRating.appendChild(labelRating);
        groupRating.appendChild(starsSelect);
        groupRating.appendChild(ratingError);

        // Name
        const groupName = document.createElement('div');
        groupName.className = 'form-group';
        const labelName = document.createElement('label');
        labelName.setAttribute('for', 'reviewName');
        labelName.textContent = 'Name';
        const inputName = document.createElement('input');
        inputName.type = 'text';
        inputName.id = 'reviewName';
        inputName.required = true;
        groupName.appendChild(labelName);
        groupName.appendChild(inputName);
        form.appendChild(groupName);

        // Email (optional)
        const groupEmail = document.createElement('div');
        groupEmail.className = 'form-group';
        const labelEmail = document.createElement('label');
        labelEmail.setAttribute('for', 'reviewEmail');
        labelEmail.textContent = 'Email (optional)';
        const inputEmail = document.createElement('input');
        inputEmail.type = 'email';
        inputEmail.id = 'reviewEmail';
        groupEmail.appendChild(labelEmail);
        groupEmail.appendChild(inputEmail);
        form.appendChild(groupEmail);

        // Title / Trip
        const groupTitle = document.createElement('div');
        groupTitle.className = 'form-group';
        const labelTitle = document.createElement('label');
        labelTitle.setAttribute('for', 'reviewTitle');
        labelTitle.textContent = 'Trip or Title (optional)';
        const inputTitle = document.createElement('input');
        inputTitle.type = 'text';
        inputTitle.id = 'reviewTitle';
        inputTitle.placeholder = 'e.g., 3-Day Gorilla Trek';
        groupTitle.appendChild(labelTitle);
        groupTitle.appendChild(inputTitle);
        form.appendChild(groupTitle);

        // Review text
        const groupText = document.createElement('div');
        groupText.className = 'form-group';
        const labelText = document.createElement('label');
        labelText.setAttribute('for', 'reviewText');
        labelText.textContent = 'Your Review';
        const inputText = document.createElement('textarea');
        inputText.id = 'reviewText';
        inputText.required = true;
        const textError = document.createElement('div');
        textError.className = 'error-text';
        textError.style.display = 'none';
        groupText.appendChild(labelText);
        groupText.appendChild(inputText);
        groupText.appendChild(textError);
        form.appendChild(groupText);

        // Consent
        const groupConsent = document.createElement('div');
        groupConsent.className = 'form-group consent';
        const inputConsent = document.createElement('input');
        inputConsent.type = 'checkbox';
        inputConsent.id = 'reviewConsent';
        const labelConsent = document.createElement('label');
        labelConsent.setAttribute('for', 'reviewConsent');
        labelConsent.textContent = 'I consent to have my review published on this site.';
        groupConsent.appendChild(inputConsent);
        groupConsent.appendChild(labelConsent);
        form.appendChild(groupConsent);

        const actions = document.createElement('div');
        actions.className = 'review-modal-actions';
        const submitBtn = document.createElement('button');
        submitBtn.className = 'tripadvisor-btn primary';
        submitBtn.type = 'button';
        submitBtn.textContent = 'Submit Review';
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'tripadvisor-btn secondary';
        cancelBtn.type = 'button';
        cancelBtn.textContent = 'Cancel';
        actions.appendChild(submitBtn);
        actions.appendChild(cancelBtn);

        body.appendChild(form);
        body.appendChild(actions);
        content.appendChild(header);
        content.appendChild(body);
        overlay.appendChild(content);
        console.log('📦 Modal elements created, appending to body...');
        console.log('Body element:', document.body);
        console.log('Overlay element before append:', overlay);
        document.body.appendChild(overlay);
        console.log('✅ Modal appended to DOM. Overlay element:', overlay);
        console.log('🔍 Checking if modal is in DOM:', document.getElementById('reviewFormModal'));
        console.log('🎯 Modal should be visible now');
        
        // Force a repaint
        setTimeout(() => {
            console.log('⏰ After timeout - Modal still in DOM:', document.getElementById('reviewFormModal'));
            const computedStyle = window.getComputedStyle(overlay);
            console.log('🎨 Modal computed styles:', {
                display: computedStyle.display,
                position: computedStyle.position,
                zIndex: computedStyle.zIndex,
                opacity: computedStyle.opacity,
                visibility: computedStyle.visibility
            });
        }, 100);

        function close() {
            document.removeEventListener('keydown', onKey);
            overlay.removeEventListener('click', onOverlay);
            overlay.remove();
        }
        function onKey(e) { if (e.key === 'Escape') close(); }
        function onOverlay(e) { if (e.target === overlay) close(); }
        document.addEventListener('keydown', onKey);
        overlay.addEventListener('click', onOverlay);
        closeBtn.addEventListener('click', close);
        cancelBtn.addEventListener('click', close);

        function validate() {
            let ok = true;
            ratingError.style.display = 'none';
            textError.style.display = 'none';
            if (selectedRating < 1) {
                ratingError.textContent = 'Please select a rating.';
                ratingError.style.display = 'block';
                ok = false;
            }
            const textVal = (inputText.value || '').trim();
            if (textVal.length < 20) {
                textError.textContent = 'Please write at least 20 characters.';
                textError.style.display = 'block';
                ok = false;
            }
            if (!inputName.value.trim()) {
                // reuse ratingError area to avoid clutter
                ratingError.textContent = 'Please enter your name.';
                ratingError.style.display = 'block';
                ok = false;
            }
            if (!inputConsent.checked) {
                textError.textContent = 'Please confirm consent to publish your review.';
                textError.style.display = 'block';
                ok = false;
            }
            return ok;
        }

        function formatDate(ts) {
            return 'Just now';
        }

        function appendReviewCard(review) {
            const card = document.createElement('div');
            card.className = 'review-card';
            const header = document.createElement('div');
            header.className = 'review-header';
            const starsEl = document.createElement('div');
            starsEl.className = 'stars';
            starsEl.textContent = '★★★★★'.slice(0, review.rating);
            const dateEl = document.createElement('span');
            dateEl.className = 'review-date';
            dateEl.textContent = formatDate(review.timestamp);
            header.appendChild(starsEl);
            header.appendChild(dateEl);
            const p = document.createElement('p');
            p.textContent = review.text;
            const author = document.createElement('div');
            author.className = 'review-author';
            const ai = document.createElement('i');
            ai.className = 'fas fa-user-circle';
            const as = document.createElement('span');
            as.textContent = review.name;
            author.appendChild(ai);
            author.appendChild(as);
            const trip = document.createElement('div');
            trip.className = 'review-trip';
            const ti = document.createElement('i');
            ti.className = 'fas fa-map-marker-alt';
            const ts = document.createElement('span');
            ts.textContent = review.title || '';
            trip.appendChild(ti);
            trip.appendChild(ts);

            card.appendChild(header);
            card.appendChild(p);
            if (as.textContent) card.appendChild(author);
            if (ts.textContent) card.appendChild(trip);

            // metadata
            card.dataset.rating = String(review.rating);
            card.dataset.timestamp = String(review.timestamp);
            card.dataset.index = String(cards.length);

            cardsContainer.prepend(card);
            cards.push(card);
            // wire up behaviors
            setupCardReadMore(card);
            setupCardOpenModal(card);
            return card;
        }

        function saveUserReview(review) {
            try {
                const key = 'userReviews';
                const arr = JSON.parse(localStorage.getItem(key) || '[]');
                arr.push(review);
                localStorage.setItem(key, JSON.stringify(arr));
            } catch (e) {
                console.warn('Failed to save review', e);
            }
        }

        submitBtn.addEventListener('click', () => {
            if (!validate()) return;
            const review = {
                rating: selectedRating,
                name: inputName.value.trim(),
                email: inputEmail.value.trim(),
                title: inputTitle.value.trim(),
                text: inputText.value.trim(),
                timestamp: Date.now()
            };
            appendReviewCard(review);
            saveUserReview(review);
            // Optional: send to Google Form if configured via data attributes
            if ((section.dataset.reviewsSource || '').toLowerCase() === 'google' && section.dataset.gformUrl) {
                submitToGoogleForm(section, review);
            }
            // Re-apply filter/sort
            const sortSelect = document.getElementById('reviewSort');
            if (sortSelect) sortCards(sortSelect.value);
            close();
            // simple ack
            setTimeout(() => { console.log('✅ Review submitted'); }, 0);
        });

        setTimeout(() => closeBtn.focus(), 0);
    }

    function setupCardOpenModal(card) {
        card.addEventListener('click', (e) => {
            // Ignore clicks from internal controls like read-more
            if (e.target.closest('.read-more-toggle')) return;
            openReviewModal(card);
        });
    }
    
    function applyFilter(filter) {
        cards.forEach(card => {
            const rating = parseInt(card.dataset.rating || '0', 10);
            let show = true;
            if (filter === '5') show = rating === 5;
            else if (filter === '4') show = rating >= 4;
            card.style.display = show ? '' : 'none';
        });
    }
    
    function sortCards(mode) {
        const visibleCards = cards.filter(c => c.style.display !== 'none');
        const sorted = visibleCards.slice().sort((a, b) => {
            const ta = parseInt(a.dataset.timestamp || '0', 10);
            const tb = parseInt(b.dataset.timestamp || '0', 10);
            const ra = parseInt(a.dataset.rating || '0', 10);
            const rb = parseInt(b.dataset.rating || '0', 10);
            if (mode === 'newest') return tb - ta;
            if (mode === 'oldest') return ta - tb;
            if (mode === 'highest') return rb - ra;
            return parseInt(a.dataset.index || '0', 10) - parseInt(b.dataset.index || '0', 10);
        });
        sorted.forEach(card => cardsContainer.appendChild(card));
    }
    
    // Filter buttons
    const filterButtons = section.querySelectorAll('.filter-buttons .filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const filter = btn.getAttribute('data-filter') || 'all';
            applyFilter(filter);
            const sortSelect = document.getElementById('reviewSort');
            sortCards(sortSelect ? sortSelect.value : 'newest');
        });
    });
    
    // Sort select
    const sortSelect = document.getElementById('reviewSort');
    if (sortSelect) {
        sortSelect.addEventListener('change', () => {
            sortCards(sortSelect.value);
        });
    }
    
    // Action buttons
    const viewAllBtn = section.querySelector('.tripadvisor-btn.primary');
    const submitBtn = section.querySelector('.tripadvisor-btn.secondary');
    if (viewAllBtn) {
        viewAllBtn.addEventListener('click', () => {
            window.open('https://www.tripadvisor.com/Search?q=dragon+fly+expedition+uganda', '_blank', 'noopener');
        });
    }
    if (submitBtn) {
        console.log('✅ Submit Review button found, adding click handler');
        submitBtn.addEventListener('click', () => {
            console.log('🔥 Submit Review button clicked');
            const mode = submitBtn.getAttribute('data-review-mode') || section.getAttribute('data-review-mode') || 'onsite';
            console.log('Review mode:', mode);
            if (mode === 'onsite') {
                console.log('Opening review form modal...');
                openReviewFormModal();
                return;
            }
            // Prefer explicit external review URL if provided
            const directUrl = submitBtn.getAttribute('data-review-url') || section.getAttribute('data-review-url');
            if (directUrl) {
                window.open(directUrl, '_blank', 'noopener');
                return;
            }
            // Fallback to previous behavior
            const contact = document.querySelector('#contact');
            if (contact && contact.scrollIntoView) {
                contact.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
                window.location.href = 'mailto:info@dragonflysexpeditions.com?subject=Review%20for%20Dragon%20Flys%20Expeditions';
            }
        });
    }
    
    function loadUserReviews() {
        try {
            const key = 'userReviews';
            const arr = JSON.parse(localStorage.getItem(key) || '[]');
            arr.forEach(r => {
                if (!r || typeof r !== 'object') return;
                // Ensure required fields
                if (!r.rating || !r.text || !r.name) return;
                if (!r.timestamp) r.timestamp = Date.now();
                // Append into DOM
                const card = document.createElement('div');
                card.className = 'review-card';
                const header = document.createElement('div');
                header.className = 'review-header';
                const starsEl = document.createElement('div');
                starsEl.className = 'stars';
                starsEl.textContent = '★★★★★'.slice(0, r.rating);
                const dateEl = document.createElement('span');
                dateEl.className = 'review-date';
                dateEl.textContent = 'Just now';
                header.appendChild(starsEl);
                header.appendChild(dateEl);
                const p = document.createElement('p');
                p.textContent = r.text;
                const author = document.createElement('div');
                author.className = 'review-author';
                const ai = document.createElement('i');
                ai.className = 'fas fa-user-circle';
                const as = document.createElement('span');
                as.textContent = r.name;
                author.appendChild(ai);
                author.appendChild(as);
                const trip = document.createElement('div');
                trip.className = 'review-trip';
                const ti = document.createElement('i');
                ti.className = 'fas fa-map-marker-alt';
                const ts = document.createElement('span');
                ts.textContent = r.title || '';
                trip.appendChild(ti);
                trip.appendChild(ts);

                card.appendChild(header);
                card.appendChild(p);
                if (as.textContent) card.appendChild(author);
                if (ts.textContent) card.appendChild(trip);

                card.dataset.rating = String(r.rating);
                card.dataset.timestamp = String(r.timestamp);
                card.dataset.index = String(cards.length);

                cardsContainer.appendChild(card);
                cards.push(card);
                setupCardReadMore(card);
                setupCardOpenModal(card);
            });
        } catch (e) {
            console.warn('Failed to load user reviews', e);
        }
    }

    // Initial state
    loadGoogleReviews();
    loadUserReviews();
    applyFilter('all');
    sortCards(sortSelect ? sortSelect.value : 'newest');
    // Setup interactions
    cards.forEach(setupCardReadMore);
    cards.forEach(setupCardOpenModal);
    // Update labels when language changes
    document.addEventListener('languageChanged', updateToggleLabelsForLanguage);
    // Ensure labels are correct on load
    updateToggleLabelsForLanguage();
    
    console.log('✅ Reviews initialized', { count: cards.length });
}

console.log('📄 Document ready state:', document.readyState);
console.log('🔍 Looking for .tripadvisor-section...');
console.log('Found sections:', document.querySelectorAll('.tripadvisor-section').length);

if (document.readyState === 'loading') {
    console.log('⏳ DOM still loading, waiting for DOMContentLoaded...');
    document.addEventListener('DOMContentLoaded', initializeReviews);
} else {
    console.log('✅ DOM ready, initializing reviews now...');
    initializeReviews();
}

// ========================================
// LIVE CHAT FUNCTIONALITY
// ========================================

// Global function for quick questions
window.askQuickQuestion = function(question) {
    console.log('askQuickQuestion called with:', question);
    
    // Find chat elements
    const chatMessages = document.querySelector('.chat-messages');
    if (!chatMessages) {
        console.log('Chat messages element not found');
        return;
    }
    
    // Add user message
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message sent';
    const messageP = document.createElement('p');
    messageP.textContent = question;
    messageDiv.appendChild(messageP);
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Simulate typing delay and add response
    setTimeout(() => {
        const responses = {
            'what tours do you offer': '🦍 We offer amazing Uganda safari tours! Our popular tours include:\n\n• 3-Day Gorilla Trekking\n• 5-Day Uganda Safari\n• 13-Day Complete Uganda Experience\n• Murchison Falls Safari\n• Queen Elizabeth Wildlife Safari\n\nWould you like details about any specific tour?',
            'how much does gorilla trekking cost': '🦍 Gorilla Trekking in Uganda:\n\n• Bwindi Impenetrable National Park\n• Mgahinga Gorilla National Park\n• $800 per person (permit included)\n• 1-8 hours trekking time\n• Maximum 8 people per group\n• 1 hour with gorillas\n\nBook now for an unforgettable experience!',
            'what is included in tours': '📋 All our tours include:\n\n• Professional English-speaking guide\n• Comfortable 4WD safari vehicle\n• All park entrance fees\n• Gorilla/chimpanzee permits\n• Full board accommodation\n• All meals (breakfast, lunch, dinner)\n• Airport transfers\n• Bottled water\n• Emergency medical evacuation\n\nNo hidden costs!',
            'how do i book a tour': '📞 To book your safari:\n\n1. Choose your preferred tour\n2. Contact us:\n   📧 info@dragonflysexpeditions.com\n   📱 +256 760 259 440\n3. We\'ll customize your itinerary\n4. Secure booking with deposit\n\nBook now for the best Uganda experience!',
            'what is the best time to visit': '🌤️ Best time to visit Uganda:\n\n• Dry Season: Dec-Feb, Jun-Sep\n• Wet Season: Mar-May, Oct-Nov\n• Gorilla trekking: Year-round\n• Wildlife viewing: Dry season\n• Bird watching: Wet season\n\nUganda\'s climate is pleasant year-round!',
            'do you provide equipment': '🎒 What to pack for your safari:\n\n• Comfortable hiking boots\n• Long pants and sleeves\n• Rain jacket\n• Camera with extra batteries\n• Binoculars\n• Sun hat and sunscreen\n• Insect repellent\n\nWe provide camping equipment and transport!'
        };
        
        const lowerQuestion = question.toLowerCase();
        let response = '🦍 Thank you for your question! Our team is here to help you plan the perfect Uganda safari adventure.\n\nFor immediate assistance:\n📧 info@dragonflysexpeditions.com\n📱 +256 760 259 440\n\nAsk me about tours, gorilla trekking, prices, or anything else!';
        
        // Find matching response
        for (const [key, value] of Object.entries(responses)) {
            if (lowerQuestion.includes(key)) {
                response = value;
                break;
            }
        }
        
        // Add response message
        const responseDiv = document.createElement('div');
        responseDiv.className = 'message received';
        const responseP = document.createElement('p');
        responseP.textContent = response;
        responseDiv.appendChild(responseP);
        chatMessages.appendChild(responseDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 1000);
};
// Backward compatibility alias for inline handlers
// If the page still uses inline onclick="handleQuickQuestion(...)",
// map it to the consolidated function to avoid reference errors.
window.handleQuickQuestion = window.askQuickQuestion;

function initializeLiveChat() {
    console.log('Initializing live chat...');
    // Guard against multiple initializations
    const chatWidget = document.querySelector('.chat-widget');
    if (chatWidget && chatWidget.dataset.chatInitialized === 'true') {
        console.log('Live chat already initialized. Skipping re-init.');
        return;
    }
    if (chatWidget) {
        chatWidget.dataset.chatInitialized = 'true';
    }
    const chatButton = document.querySelector('.chat-button');
    const chatWindow = document.querySelector('.chat-window');
    const closeChat = document.querySelector('.close-chat');
    const chatInput = document.querySelector('.chat-input input');
    const chatSendButton = document.querySelector('.chat-input button');
    const chatMessages = document.querySelector('.chat-messages');
    const quickButtons = document.querySelectorAll('.quick-btn');
    
    console.log('Chat elements found:', {
        chatButton: !!chatButton,
        chatWindow: !!chatWindow,
        closeChat: !!closeChat,
        chatInput: !!chatInput,
        chatSendButton: !!chatSendButton,
        chatMessages: !!chatMessages,
        quickButtons: quickButtons.length
    });
    
    if (!chatButton || !chatWindow) {
        console.log('Chat elements not found, returning');
        return;
    }
    
    let isOpen = false;
    let chatHistory = [];
    
    // Chat responses database
    const responses = {
        'tours': {
            keywords: ['tour', 'tours', 'safari', 'package', 'trip', 'what tours do you offer'],
            response: '🦍 We offer amazing Uganda safari tours! Our popular tours include:\n\n• 3-Day Gorilla Trekking\n• 5-Day Uganda Safari\n• 13-Day Complete Uganda Experience\n• Murchison Falls Safari\n• Queen Elizabeth Wildlife Safari\n\nWould you like details about any specific tour?'
        },
        'gorilla': {
            keywords: ['gorilla', 'trekking', 'bwindi', 'mountain gorilla', 'gorilla trekking prices', 'how much does gorilla trekking cost'],
            response: '🦍 Gorilla Trekking in Uganda:\n\n• Bwindi Impenetrable National Park\n• Mgahinga Gorilla National Park\n• $800 per person (permit included)\n• 1-8 hours trekking time\n• Maximum 8 people per group\n• 1 hour with gorillas\n\nBook now for an unforgettable experience!'
        },
        'included': {
            keywords: ['included', 'what is included', 'what\'s included', 'package includes'],
            response: '📋 All our tours include:\n\n• Professional English-speaking guide\n• Comfortable 4WD safari vehicle\n• All park entrance fees\n• Gorilla/chimpanzee permits\n• Full board accommodation\n• All meals (breakfast, lunch, dinner)\n• Airport transfers\n• Bottled water\n• Emergency medical evacuation\n\nNo hidden costs!'
        },
        'booking': {
            keywords: ['book', 'booking', 'reserve', 'how to book', 'contact', 'how do i book'],
            response: '📞 To book your safari:\n\n1. Choose your preferred tour\n2. Contact us:\n   📧 info@dragonflysexpeditions.com\n   📱 +256 760 259 440\n3. We\'ll customize your itinerary\n4. Secure booking with deposit\n\nBook now for the best Uganda experience!'
        },
        'weather': {
            keywords: ['weather', 'season', 'best time', 'rain', 'dry season', 'what is the best time to visit'],
            response: '🌤️ Best time to visit Uganda:\n\n• Dry Season: Dec-Feb, Jun-Sep\n• Wet Season: Mar-May, Oct-Nov\n• Gorilla trekking: Year-round\n• Wildlife viewing: Dry season\n• Bird watching: Wet season\n\nUganda\'s climate is pleasant year-round!'
        },
        'equipment': {
            keywords: ['equipment', 'gear', 'what to bring', 'clothes', 'packing', 'do you provide equipment', 'equipment provided'],
            response: '🎒 What to pack for your safari:\n\n• Comfortable hiking boots\n• Long pants and sleeves\n• Rain jacket\n• Camera with extra batteries\n• Binoculars\n• Sun hat and sunscreen\n• Insect repellent\n\nWe provide camping equipment and transport!'
        },
        'default': {
            response: '🦍 Thank you for your question! Our team is here to help you plan the perfect Uganda safari adventure.\n\nFor immediate assistance:\n📧 info@dragonflysexpeditions.com\n📱 +256 760 259 440\n\nAsk me about tours, gorilla trekking, prices, or anything else!'
        }
    };
    
    // Toggle chat window
    function toggleChat() {
        isOpen = !isOpen;
        if (isOpen) {
            // Use flex to match the chat layout styles in CSS
            chatWindow.style.display = 'flex';
            chatWindow.style.opacity = '1';
            chatWindow.style.transform = 'translateY(0)';
            chatInput.focus();
            // Hide notification when chat opens
            const notification = document.querySelector('.chat-notification');
            if (notification) {
                notification.style.display = 'none';
            }
        } else {
            chatWindow.style.display = 'none';
            chatWindow.style.opacity = '0';
            chatWindow.style.transform = 'translateY(20px)';
        }
    }
    
    // Add message to chat
    function addMessage(text, isUser = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'sent' : 'received'}`;
        
        const messageP = document.createElement('p');
        messageP.textContent = text;
        messageDiv.appendChild(messageP);
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // Store in chat history
        chatHistory.push({ text, isUser, timestamp: new Date() });
    }
    
    // Get response based on user input
    function getResponse(userInput) {
        const input = userInput.toLowerCase();
        
        // Check for keywords in responses
        for (const [key, data] of Object.entries(responses)) {
            if (key === 'default') continue;
            
            for (const keyword of data.keywords) {
                if (input.includes(keyword)) {
                    return data.response;
                }
            }
        }
        
        return responses.default.response;
    }
    
    // Quick question function is now defined globally above
    
    // Add event listeners to quick question buttons as backup
    function setupQuickQuestionButtons() {
        const quickButtons = document.querySelectorAll('.quick-btn');
        console.log('Setting up quick question buttons:', quickButtons.length);
        
        quickButtons.forEach((button, index) => {
            // Avoid double-trigger if inline onclick is already present in markup
            if (button.getAttribute('onclick')) {
                console.log(`Quick button ${index + 1} has inline onclick; skipping extra listener.`);
                return;
            }
            // Keep onclick attributes but also add event listeners as backup
            button.addEventListener('click', function(e) {
                e.preventDefault();
                const question = this.textContent.trim();
                console.log('Quick question clicked via event listener:', question);
                if (window.askQuickQuestion) {
                    window.askQuickQuestion(question);
                }
            });
            console.log(`Quick button ${index + 1} setup complete`);
        });
    }
    
    // Handle send button click
    function handleSendMessage() {
        const message = chatInput.value.trim();
        if (!message) return;
        
        addMessage(message, true);
        chatInput.value = '';
        
        // Simulate typing delay
        setTimeout(() => {
            const response = getResponse(message);
            addMessage(response, false);
        }, 1500);
    }
    
    // Handle Enter key in input
    function handleKeyPress(e) {
        if (e.key === 'Enter') {
            handleSendMessage();
        }
    }
    
    // Event listeners
    chatButton.addEventListener('click', toggleChat);
    closeChat.addEventListener('click', toggleChat);
    chatSendButton.addEventListener('click', handleSendMessage);
    chatInput.addEventListener('keypress', handleKeyPress);
    
    // Setup quick question buttons
    setupQuickQuestionButtons();
    
    // Auto-open chat after 10 seconds on page load
    setTimeout(() => {
        if (!isOpen) {
            const notification = document.querySelector('.chat-notification');
            if (notification) {
                notification.style.display = 'block';
                notification.style.animation = 'pulse 2s infinite';
            }
        }
    }, 10000);
    
    // Close chat when clicking outside
    document.addEventListener('click', (e) => {
        if (isOpen && !chatWindow.contains(e.target) && !chatButton.contains(e.target)) {
            toggleChat();
        }
    });
}

// Initialize live chat
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeLiveChat);
} else {
    initializeLiveChat();
}

// Also try to initialize after a short delay to ensure DOM is ready
setTimeout(() => {
    console.log('Delayed initialization attempt...');
    if (typeof window.askQuickQuestion === 'undefined') {
        console.log('askQuickQuestion still undefined, redefining...');
        // Redefine the function if it's not available
        window.askQuickQuestion = function(question) {
            console.log('Delayed askQuickQuestion called with:', question);
            alert('Quick question clicked: ' + question);
        };
    }
}, 1000);
