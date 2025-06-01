import 'package:flutter/material.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with TickerProviderStateMixin {
  int currentIndex = 0;
  bool isListening = false;
  bool showMenu = false;
  Offset fabPosition = const Offset(300, 600); // Draggable FAB position
  
  // Device states
  bool isLightOn = false;
  bool isAcOn = false;
  bool isSecurityOn = true;
  bool isDarkMode = false;
  double temperature = 22.0;
  double lightBrightness = 80.0;
  
  // Animation controllers
  late AnimationController pulseController;
  late Animation<double> pulseAnimation;

  @override
  void initState() {
    super.initState();
    pulseController = AnimationController(
      duration: const Duration(seconds: 1),
      vsync: this,
    );
    pulseAnimation = Tween<double>(
      begin: 1.0,
      end: 1.2,
    ).animate(CurvedAnimation(
      parent: pulseController,
      curve: Curves.easeInOut,
    ));
  }

  @override
  void dispose() {
    pulseController.dispose();
    super.dispose();
  }

  void startListening() {
    setState(() => isListening = true);
    pulseController.repeat(reverse: true);
    
    // Simulated voice command processing
    Future.delayed(const Duration(seconds: 3), () {
      setState(() => isListening = false);
      pulseController.stop();
      pulseController.reset();
      showVoiceCommandResult("Oturma odası ışıkları açıldı");
    });
  }

  void showVoiceCommandResult(String result) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        margin: const EdgeInsets.all(16),
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: isDarkMode ? Colors.grey[800] : Colors.white,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.check_circle,
              color: Colors.green,
              size: 48,
            ),
            const SizedBox(height: 16),
            Text(
              "Komut Başarılı",
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: isDarkMode ? Colors.white : Colors.black,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              result,
              style: TextStyle(
                fontSize: 16,
                color: isDarkMode ? Colors.grey[300] : Colors.grey[600],
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: () => Navigator.pop(context),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.blue,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
              child: const Text("Tamam"),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final backgroundColor = isDarkMode ? Colors.grey[900] : Colors.grey.shade50;
    final cardColor = isDarkMode ? Colors.grey[800] : Colors.white;
    final textColor = isDarkMode ? Colors.white : Colors.black;
    
    return Scaffold(
      backgroundColor: backgroundColor,
      bottomNavigationBar: BottomNavigationBar(
        type: BottomNavigationBarType.fixed,
        selectedItemColor: Colors.blue,
        unselectedItemColor: Colors.grey,
        backgroundColor: cardColor,
        currentIndex: currentIndex,
        onTap: (index) {
          if (index == 3) {
            // Menu button
            setState(() => showMenu = !showMenu);
          } else {
            setState(() {
              currentIndex = index;
              showMenu = false;
            });
          }
        },
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.home),
            label: 'Ana Sayfa',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.dashboard_customize),
            label: 'Senaryolar',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.notifications),
            label: 'Bildirimler',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.menu),
            label: 'Menü',
          ),
        ],
      ),
      body: Stack(
        children: [
          SafeArea(
            child: IndexedStack(
              index: currentIndex,
              children: [
                buildHomeTab(cardColor!, textColor),
                buildScenariosTab(cardColor, textColor),
                buildNotificationsTab(cardColor, textColor),
                Container(), // Placeholder for menu tab
              ],
            ),
          ),
          
          // Draggable FAB
          Positioned(
            left: fabPosition.dx,
            top: fabPosition.dy,
            child: Draggable(
              feedback: AnimatedBuilder(
                animation: pulseAnimation,
                builder: (context, child) {
                  return Transform.scale(
                    scale: isListening ? pulseAnimation.value : 1.0,
                    child: FloatingActionButton(
                      onPressed: null,
                      backgroundColor: isListening ? Colors.red : Colors.blue,
                      child: Icon(
                        isListening ? Icons.mic : Icons.smart_toy,
                        color: Colors.white,
                      ),
                    ),
                  );
                },
              ),
              childWhenDragging: Container(),
              onDragEnd: (details) {
                setState(() {
                  fabPosition = details.offset;
                });
              },
              child: AnimatedBuilder(
                animation: pulseAnimation,
                builder: (context, child) {
                  return Transform.scale(
                    scale: isListening ? pulseAnimation.value : 1.0,
                    child: FloatingActionButton(
                      onPressed: isListening ? null : startListening,
                      backgroundColor: isListening ? Colors.red : Colors.blue,
                      child: Icon(
                        isListening ? Icons.mic : Icons.smart_toy,
                        color: Colors.white,
                      ),
                    ),
                  );
                },
              ),
            ),
          ),
          
          // Slide-up Menu
          if (showMenu)
            GestureDetector(
              onTap: () => setState(() => showMenu = false),
              child: Container(
                color: Colors.black.withValues(alpha: 0.5),
                child: Align(
                  alignment: Alignment.bottomCenter,
                  child: Container(
                    width: double.infinity,
                    height: MediaQuery.of(context).size.height * 0.6,
                    decoration: BoxDecoration(
                      color: cardColor,
                      borderRadius: const BorderRadius.only(
                        topLeft: Radius.circular(20),
                        topRight: Radius.circular(20),
                      ),
                    ),
                    child: _buildMenuContent(cardColor, textColor),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget buildHomeTab(Color cardColor, Color textColor) {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: ListView(
        children: [
          // Header with greeting and theme toggle
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    "Merhaba! 👋",
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: textColor,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    "Evinizi sesli komutlarla kontrol edin",
                    style: TextStyle(
                      fontSize: 16,
                      color: Colors.grey.shade600,
                    ),
                  ),
                ],
              ),
              Row(
                children: [
                  IconButton(
                    onPressed: () => setState(() => isDarkMode = !isDarkMode),
                    icon: Icon(
                      isDarkMode ? Icons.light_mode : Icons.dark_mode,
                      color: Colors.blue,
                    ),
                  ),
                  CircleAvatar(
                    backgroundColor: Colors.blue.shade100,
                    child: const Icon(Icons.person, color: Colors.blue),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 24),

          // AI Status Card
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [Colors.purple.shade400, Colors.blue.shade600],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        "AI Asistan Durumu",
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        "Çevrimiçi",
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const Text(
                        "Deepseek-R1 Modeli Aktif",
                        style: TextStyle(
                          color: Colors.white70,
                          fontSize: 14,
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(
                    Icons.psychology,
                    color: Colors.white,
                    size: 32,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Weather and status card
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [Colors.blue.shade400, Colors.blue.shade600],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        "Ev Durumu",
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        "${temperature.toInt()}°C",
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 32,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        "${getActiveDeviceCount()} cihaz aktif",
                        style: const TextStyle(
                          color: Colors.white70,
                          fontSize: 14,
                        ),
                      ),
                    ],
                  ),
                ),
                const Icon(
                  Icons.home,
                  color: Colors.white,
                  size: 48,
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Quick access
          Text(
            "Hızlı Erişim",
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: textColor,
            ),
          ),
          const SizedBox(height: 12),
          
          Row(
            children: [
              Expanded(
                child: buildQuickAccessCard(
                  "Işıklar",
                  isLightOn ? Icons.lightbulb : Icons.lightbulb_outline,
                  isLightOn ? Colors.amber : Colors.grey,
                  isLightOn,
                  () => setState(() => isLightOn = !isLightOn),
                  cardColor,
                  textColor,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: buildQuickAccessCard(
                  "Klima",
                  Icons.ac_unit,
                  isAcOn ? Colors.blue : Colors.grey,
                  isAcOn,
                  () => setState(() => isAcOn = !isAcOn),
                  cardColor,
                  textColor,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          
          Row(
            children: [
              Expanded(
                child: buildQuickAccessCard(
                  "Güvenlik",
                  Icons.security,
                  isSecurityOn ? Colors.green : Colors.grey,
                  isSecurityOn,
                  () => setState(() => isSecurityOn = !isSecurityOn),
                  cardColor,
                  textColor,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: buildQuickAccessCard(
                  "Tüm Işıklar",
                  Icons.lightbulb_outline,
                  Colors.orange,
                  false,
                  () {
                    setState(() {
                      isLightOn = !isLightOn;
                    });
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(isLightOn ? 'Tüm ışıklar açıldı' : 'Tüm ışıklar kapatıldı'),
                        backgroundColor: Colors.blue,
                      ),
                    );
                  },
                  cardColor,
                  textColor,
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Voice Commands Help
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: cardColor,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.blue.shade200),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(Icons.tips_and_updates, color: Colors.blue),
                    const SizedBox(width: 8),
                    Text(
                      "Sesli Komut Örnekleri",
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: textColor,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                buildCommandExample("🔆", "\"Işıkları aç\""),
                buildCommandExample("❄️", "\"Klimayı 20 dereceye ayarla\""),
                buildCommandExample("🏠", "\"Eve varış senaryosunu başlat\""),
                buildCommandExample("🛡️", "\"Güvenlik sistemini etkinleştir\""),
              ],
            ),
          ),
          const SizedBox(height: 100), // Bottom padding for FAB
        ],
      ),
    );
  }

  Widget buildCommandExample(String emoji, String command) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Text(
        "$emoji $command",
        style: TextStyle(
          fontSize: 14,
          color: Colors.grey.shade600,
        ),
      ),
    );
  }

  Widget buildScenariosTab(Color cardColor, Color textColor) {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                "Otomasyon Senaryoları",
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: textColor,
                ),
              ),
              IconButton(
                onPressed: () {
                  _showCreateScenarioDialog(cardColor, textColor);
                },
                icon: const Icon(Icons.add_circle_outline, color: Colors.blue),
              ),
            ],
          ),
          const SizedBox(height: 20),
          
          // Hızlı Senaryolar
          Text(
            "Hızlı Erişim",
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: textColor,
            ),
          ),
          const SizedBox(height: 12),
          
          SizedBox(
            height: 120,
            child: ListView(
              scrollDirection: Axis.horizontal,
              children: [
                _buildQuickScenarioCard(
                  "Eve Varış",
                  Icons.home_filled,
                  Colors.green,
                  cardColor,
                  textColor,
                ),
                _buildQuickScenarioCard(
                  "Uyku Modu",
                  Icons.bedtime,
                  Colors.indigo,
                  cardColor,
                  textColor,
                ),
                _buildQuickScenarioCard(
                  "Film Modu",
                  Icons.movie,
                  Colors.purple,
                  cardColor,
                  textColor,
                ),
                _buildQuickScenarioCard(
                  "Sabah Rutini",
                  Icons.wb_sunny,
                  Colors.orange,
                  cardColor,
                  textColor,
                ),
              ],
            ),
          ),
          
          const SizedBox(height: 24),
          
          Text(
            "Tüm Senaryolar",
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: textColor,
            ),
          ),
          const SizedBox(height: 12),
          
          Expanded(
            child: ListView(
              children: [
                _buildDetailedScenarioCard(
                  "Eve Varış",
                  "Işıkları aç, klimayı 22°C yap, müziği çal, perdeleri aç",
                  Icons.home_filled,
                  Colors.green,
                  cardColor,
                  textColor,
                  ["💡 5 ışık", "❄️ Klima", "🎵 Müzik", "🪟 Perde"],
                  true,
                ),
                _buildDetailedScenarioCard(
                  "Uyku Modu",
                  "Tüm ışıkları kapat, güvenliği etkinleştir, sıcaklığı düşür",
                  Icons.bedtime,
                  Colors.indigo,
                  cardColor,
                  textColor,
                  ["💡 Tüm ışıklar", "🛡️ Güvenlik", "🌡️ Termostat"],
                  false,
                ),
                _buildDetailedScenarioCard(
                  "Film Modu",
                  "Işıkları %10'a düşür, perdeleri kapat, ses sistemini aç",
                  Icons.movie,
                  Colors.purple,
                  cardColor,
                  textColor,
                  ["💡 Ambient ışık", "🪟 Perdeler", "🔊 Ses sistemi"],
                  false,
                ),
                _buildDetailedScenarioCard(
                  "Sabah Rutini",
                  "Işıkları aç, kahve makinesini başlat, haber açık",
                  Icons.wb_sunny,
                  Colors.orange,
                  cardColor,
                  textColor,
                  ["💡 Yatak odası", "☕ Kahve", "📺 TV"],
                  true,
                ),
                _buildDetailedScenarioCard(
                  "İş Moduna Geç",
                  "Ofis ışıklarını aç, klimayı 20°C yap, bilgisayarı başlat",
                  Icons.work,
                  Colors.blue,
                  cardColor,
                  textColor,
                  ["💡 Ofis", "❄️ AC", "💻 PC"],
                  false,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget buildNotificationsTab(Color cardColor, Color textColor) {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                "Bildirimler",
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: textColor,
                ),
              ),
              TextButton(
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Tüm bildirimler okundu olarak işaretlendi')),
                  );
                },
                child: const Text("Tümünü Okundu İşaretle"),
              ),
            ],
          ),
          const SizedBox(height: 20),
          
          // Bildirim kategorileri
          SizedBox(
            height: 40,
            child: ListView(
              scrollDirection: Axis.horizontal,
              children: [
                _buildNotificationChip("Tümü", true, cardColor),
                _buildNotificationChip("Güvenlik", false, cardColor),
                _buildNotificationChip("Enerji", false, cardColor),
                _buildNotificationChip("Cihazlar", false, cardColor),
                _buildNotificationChip("AI", false, cardColor),
              ],
            ),
          ),
          
          const SizedBox(height: 20),
          
          Expanded(
            child: ListView(
              children: [
                _buildNotificationItem(
                  Icons.security,
                  "Güvenlik Uyarısı",
                  "Ön kapı sensörü etkinleşti. Kapı 5 dakikadır açık.",
                  "5 dakika önce",
                  Colors.red,
                  cardColor,
                  textColor,
                  isRead: false,
                  isImportant: true,
                ),
                _buildNotificationItem(
                  Icons.psychology,
                  "AI Asistan",
                  "Ses komutunuz başarıyla işlendi: 'Oturma odası ışıklarını aç'",
                  "12 dakika önce",
                  Colors.blue,
                  cardColor,
                  textColor,
                  isRead: true,
                ),
                _buildNotificationItem(
                  Icons.lightbulb,
                  "Enerji Tasarrufu",
                  "Yatak odası ışığı 2 saattir açık. Kapatmak ister misiniz?",
                  "1 saat önce",
                  Colors.orange,
                  cardColor,
                  textColor,
                  isRead: false,
                  hasAction: true,
                ),
                _buildNotificationItem(
                  Icons.thermostat,
                  "Sıcaklık Kontrol",
                  "Ev sıcaklığı hedef değere ulaştı (22°C)",
                  "2 saat önce",
                  Colors.green,
                  cardColor,
                  textColor,
                  isRead: true,
                ),
                _buildNotificationItem(
                  Icons.wifi_off,
                  "Bağlantı Sorunu",
                  "Akıllı fırın ile bağlantı kesildi. Yeniden deneniyor...",
                  "3 saat önce",
                  Colors.grey,
                  cardColor,
                  textColor,
                  isRead: false,
                ),
                _buildNotificationItem(
                  Icons.schedule,
                  "Otomasyon Tamamlandı",
                  "'Sabah Rutini' senaryosu başarıyla çalıştırıldı",
                  "8 saat önce",
                  Colors.purple,
                  cardColor,
                  textColor,
                  isRead: true,
                ),
                _buildNotificationItem(
                  Icons.battery_alert,
                  "Düşük Pil Uyarısı",
                  "Yatak odası sensörünün pil seviyesi %15'e düştü",
                  "1 gün önce",
                  Colors.red,
                  cardColor,
                  textColor,
                  isRead: false,
                  hasAction: true,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget buildQuickAccessCard(
    String title,
    IconData icon,
    Color color,
    bool isActive,
    VoidCallback onTap,
    Color cardColor,
    Color textColor,
  ) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: cardColor,
          borderRadius: BorderRadius.circular(12),
          border: isActive 
            ? Border.all(color: color, width: 2)
            : Border.all(color: Colors.grey.shade200),
          boxShadow: [
            BoxShadow(
              color: Colors.grey.shade200,
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 32),
            const SizedBox(height: 8),
            Text(
              title,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: textColor,
              ),
            ),
            if (isActive)
              Container(
                margin: const EdgeInsets.only(top: 4),
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  "AÇIK",
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    color: color,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  int getActiveDeviceCount() {
    int count = 0;
    if (isLightOn) count++;
    if (isAcOn) count++;
    if (isSecurityOn) count++;
    return count;
  }

  Widget _buildMenuContent(Color cardColor, Color textColor) {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          // Handle bar
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: Colors.grey.shade400,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 20),
          
          Text(
            "Menü",
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: textColor,
            ),
          ),
          const SizedBox(height: 30),
          
          Expanded(
            child: ListView(
              children: [
                _buildSettingsCategory(
                  "Genel",
                  [
                    _buildSettingsItem(
                      Icons.palette,
                      "Tema",
                      isDarkMode ? "Koyu Mod" : "Açık Mod",
                      cardColor,
                      textColor,
                      trailing: Switch(
                        value: isDarkMode,
                        onChanged: (value) => setState(() => isDarkMode = value),
                        activeColor: Colors.blue,
                      ),
                    ),
                    _buildSettingsItem(
                      Icons.language,
                      "Dil",
                      "Türkçe",
                      cardColor,
                      textColor,
                    ),
                    _buildSettingsItem(
                      Icons.notifications,
                      "Bildirimler",
                      "Etkin",
                      cardColor,
                      textColor,
                    ),
                  ],
                  textColor,
                ),
                
                const SizedBox(height: 20),
                
                _buildSettingsCategory(
                  "AI & Otomasyon",
                  [
                    _buildSettingsItem(
                      Icons.psychology,
                      "AI Asistan",
                      "Deepseek-R1 Model",
                      cardColor,
                      textColor,
                    ),
                    _buildSettingsItem(
                      Icons.mic,
                      "Ses Komutları",
                      "Etkin",
                      cardColor,
                      textColor,
                    ),
                    _buildSettingsItem(
                      Icons.auto_awesome,
                      "Otomatik Senaryolar",
                      "3 aktif",
                      cardColor,
                      textColor,
                    ),
                  ],
                  textColor,
                ),
                
                const SizedBox(height: 20),
                
                _buildSettingsCategory(
                  "Bağlantı & Güvenlik",
                  [
                    _buildSettingsItem(
                      Icons.wifi,
                      "Ağ Ayarları",
                      "192.168.1.100",
                      cardColor,
                      textColor,
                    ),
                    _buildSettingsItem(
                      Icons.home_work,
                      "Home Assistant",
                      "Bağlı",
                      cardColor,
                      textColor,
                      statusColor: Colors.green,
                    ),
                    _buildSettingsItem(
                      Icons.security,
                      "Güvenlik",
                      "Biometric aktif",
                      cardColor,
                      textColor,
                    ),
                  ],
                  textColor,
                ),
                
                const SizedBox(height: 20),
                
                _buildSettingsCategory(
                  "Destek",
                  [
                    _buildSettingsItem(
                      Icons.help,
                      "Yardım",
                      "SSS ve rehberler",
                      cardColor,
                      textColor,
                    ),
                    _buildSettingsItem(
                      Icons.info,
                      "Hakkında",
                      "HomeOS v1.0",
                      cardColor,
                      textColor,
                    ),
                  ],
                  textColor,
                ),
                
                const SizedBox(height: 30),
                
                // Çıkış butonu
                Container(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: () {
                      _showLogoutDialog(cardColor, textColor);
                    },
                    icon: const Icon(Icons.logout),
                    label: const Text("Çıkış Yap"),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.red,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuickScenarioCard(
    String title,
    IconData icon,
    Color color,
    Color cardColor,
    Color textColor,
  ) {
    return Container(
      width: 120,
      margin: const EdgeInsets.only(right: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.shade200,
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: color, size: 24),
          ),
          const SizedBox(height: 8),
          Text(
            title,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: textColor,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildDetailedScenarioCard(
    String title,
    String description,
    IconData icon,
    Color color,
    Color cardColor,
    Color textColor,
    List<String> devices,
    bool isActive,
  ) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(12),
        border: isActive ? Border.all(color: color, width: 2) : null,
        boxShadow: [
          BoxShadow(
            color: Colors.grey.shade200,
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: color, size: 24),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          title,
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: textColor,
                          ),
                        ),
                        if (isActive) ...[
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: color.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Text(
                              "AKTİF",
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: color,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      description,
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.grey.shade600,
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('$title senaryosu başlatıldı'),
                      backgroundColor: color,
                    ),
                  );
                },
                icon: Icon(
                  isActive ? Icons.stop : Icons.play_arrow,
                  color: Colors.blue,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 4,
            children: devices.map((device) => Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.grey.shade100,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                device,
                style: const TextStyle(fontSize: 12),
              ),
            )).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildNotificationChip(String label, bool isSelected, Color cardColor) {
    return Container(
      margin: const EdgeInsets.only(right: 8),
      child: FilterChip(
        label: Text(label),
        selected: isSelected,
        onSelected: (selected) {
          // Handle filter selection
        },
        selectedColor: Colors.blue.withValues(alpha: 0.2),
        backgroundColor: cardColor,
        side: BorderSide(
          color: isSelected ? Colors.blue : Colors.grey.shade300,
        ),
      ),
    );
  }

  Widget _buildNotificationItem(
    IconData icon,
    String title,
    String message,
    String time,
    Color color,
    Color cardColor,
    Color textColor, {
    bool isRead = true,
    bool isImportant = false,
    bool hasAction = false,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isRead ? Colors.grey.shade200 : Colors.blue.shade200,
          width: isRead ? 1 : 2,
        ),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, color: color, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          title,
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: textColor,
                          ),
                        ),
                        if (isImportant) ...[
                          const SizedBox(width: 4),
                          Icon(Icons.priority_high, color: Colors.red, size: 16),
                        ],
                        if (!isRead) ...[
                          const SizedBox(width: 4),
                          Container(
                            width: 8,
                            height: 8,
                            decoration: const BoxDecoration(
                              color: Colors.blue,
                              shape: BoxShape.circle,
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      message,
                      style: TextStyle(
                        fontSize: 13,
                        color: Colors.grey.shade600,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      time,
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey.shade500,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          if (hasAction) ...[
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton(
                  onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('İşlem reddedildi')),
                    );
                  },
                  child: const Text("Reddet"),
                ),
                const SizedBox(width: 8),
                ElevatedButton(
                  onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('İşlem kabul edildi')),
                    );
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: color,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  ),
                  child: const Text("Kabul"),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildSettingsCategory(String title, List<Widget> items, Color textColor) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            color: textColor,
          ),
        ),
        const SizedBox(height: 8),
        ...items,
      ],
    );
  }

  Widget _buildSettingsItem(
    IconData icon,
    String title,
    String subtitle,
    Color cardColor,
    Color textColor, {
    Widget? trailing,
    Color? statusColor,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Icon(icon, color: Colors.blue),
        title: Text(
          title,
          style: TextStyle(
            fontWeight: FontWeight.w500,
            color: textColor,
          ),
        ),
        subtitle: Row(
          children: [
            if (statusColor != null) ...[
              Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(
                  color: statusColor,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 6),
            ],
            Text(
              subtitle,
              style: TextStyle(
                color: Colors.grey.shade600,
              ),
            ),
          ],
        ),
        trailing: trailing ?? const Icon(Icons.arrow_forward_ios, size: 16),
        tileColor: cardColor,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
        ),
        onTap: () {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('$title sayfası açılıyor...')),
          );
        },
      ),
    );
  }

  void _showCreateScenarioDialog(Color cardColor, Color textColor) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: cardColor,
        title: Text('Yeni Senaryo', style: TextStyle(color: textColor)),
        content: Text('Senaryo oluşturma sayfası açılacak...', style: TextStyle(color: textColor)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('İptal'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Senaryo oluşturma sayfası açılıyor...')),
              );
            },
            child: const Text('Devam'),
          ),
        ],
      ),
    );
  }

  void _showLogoutDialog(Color cardColor, Color textColor) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: cardColor,
        title: Text('Çıkış Yap', style: TextStyle(color: textColor)),
        content: Text('Çıkış yapmak istediğinizden emin misiniz?', style: TextStyle(color: textColor)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('İptal'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              Navigator.pushReplacementNamed(context, '/login');
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Çıkış Yap', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }
}