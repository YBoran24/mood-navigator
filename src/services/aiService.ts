import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

if (!API_KEY) {
    console.error("Gemini API Key bulunamadı! .env dosyasını kontrol et.");
}

const genAI = new GoogleGenerativeAI(API_KEY || "");

export const analyzePlaceMood = async (
    placeName: string,
    mood: string,
    vicinity: string,
    types: string[] = []
): Promise<{
    score: number;
    reason: string;
    suggestion: string;
    why_visit: string;
    crowd_status: string;
    ai_comment: string;
}> => {

    try {
        console.log(`Analiz Başlıyor: ${placeName}`);

        // Senin hesabında açık olan en hızlı ve yeni model
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const placeTypeStr = types.length > 0 ? types.join(", ") : "Bilgi yok";

        const prompt = `
        Görevin: Bir mekanın kullanıcının moduna uygunluğunu analiz et ve yerel bir rehber gibi detaylı bilgi ver.
        
        Mekan: "${placeName}"
        Adres/Bölge: "${vicinity}"
        Türler: "${placeTypeStr}"
        İstenen Mod: "${mood}"
        Saat: ${new Date().toLocaleTimeString('tr-TR')} (Bu saate göre yoğunluk tahmini yap)

        Aşağıdaki mantığa göre yanıt ver:

        1. **Dinamik Öneri (suggestion)**: 
           - Eğer Müze/Tarihi Yer ise: "Giriş Ücreti" bilgisini tahmini yaz (Örn: 'Müze Kart geçerli, giriş 200₺').
           - Eğer Kafe ise: "Ne İçilir & Ortalama Fiyat" yaz (Örn: 'Latte içmelisin ~90₺').
           - Eğer Restoran ise: "Ne Yenir & Fiyat" yaz (Örn: 'Hamburger menü ~350₺').
           - Diğer durumlarda en mantıklı öneriyi yap.

        2. **Neden Gelmelisin (why_visit)**: 
           - Tarihi yerler için kısa tarihçe.
           - Kafeler için ortamın öne çıkan özelliği (sessiz, manzaralı vs).
           - Diğerleri için cazibe noktası.

        3. **Yoğunluk Tahmini (crowd_status)**: 
           - Mekanın popülerliğine ve şu anki saate bakarak tahmin yap.
           - Örn: '🔴 Yoğun (%85) - Sıra olabilir' veya '🟢 Sakin (%20) - Yer var'.

        4. **AI Yorumu (ai_comment)**: 
           - Samimi, arkadaşça tek cümlelik bir tavsiye/uyarı.

        Yanıtı SADECE şu JSON formatında ver:
        {
          "score": (0-10 arası puan),
          "reason": (Puanın gerekçesi),
          "suggestion": (Yukarıdaki mantığa göre öneri),
          "why_visit": (Neden buraya gelmeli?),
          "crowd_status": (Yoğunluk durumu),
          "ai_comment": (Kısa tavsiye)
        }
        
        ÖNEMLİ: Müzik önerisi verme. Bildiğin gerçek detayları kullan. SADECE JSON.
        `;

        let text = "";

        // 5 Kere Deneme Hakkı (Daha uzun süre bekleme)
        for (let attempt = 1; attempt <= 5; attempt++) {
            try {
                const result = await model.generateContent(prompt);
                const response = await result.response;
                text = response.text();
                break; // Başarılı olduysa döngüden çık
            } catch (err: any) {
                console.log(`Deneme ${attempt} başarısız: ${err.message}`);

                // Eğer son denemeyse veya hata 429 değilse hatayı fırlat
                if (attempt === 5 || !err.message?.includes("429")) {
                    throw err;
                }

                // Bekle ve tekrar dene (Her seferinde 5 saniye artarak bekle)
                const waitTime = attempt * 5000;
                console.log(`429 Hatası. ${waitTime / 1000} saniye bekleniyor (Deneme ${attempt}/5)...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }

        console.log("AI Yanıtı:", text);

        // Temizlik (AI bazen ```json yazar, onu siliyoruz)
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        let json;
        try {
            json = JSON.parse(cleanText);
        } catch (e) {
            console.error("JSON Parse Hatası:", e);
            // Fallback
            json = {
                score: 0,
                reason: "AI yanıtı anlaşılamadı.",
                suggestion: "Bilgi yok",
                why_visit: "Bilgi yok",
                crowd_status: "⚪ Bilinmiyor",
                ai_comment: "Bağlantı sorunu olabilir."
            };
        }

        return {
            score: json.score || 0,
            reason: json.reason || "Neden belirtilmedi.",
            suggestion: json.suggestion || "Öneri yok.",
            why_visit: json.why_visit || "Detay yok.",
            crowd_status: json.crowd_status || "Bilinmiyor",
            ai_comment: json.ai_comment || "Yorum yok."
        };

    } catch (error: any) {
        console.error("AI HATASI:", error);

        // Kullanıcıya hatayı net gösterelim
        let msg = `Bağlantı sorunu: ${error.message}`;
        if (error.message.includes("429")) msg = "Sistem yoğun. (5 deneme başarısız). 1-2 dk bekle.";

        return {
            score: 0,
            reason: msg,
            suggestion: "",
            why_visit: "",
            crowd_status: "",
            ai_comment: ""
        };
    }
};