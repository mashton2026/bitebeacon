import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
    Linking,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

const SUPPORT_EMAIL = "support@bitebeacon.uk";

type FAQItem = {
    category:
    | "Getting Started"
    | "Map & Discovery"
    | "Accounts"
    | "Vendors"
    | "Billing"
    | "Support";
    title: string;
    content: string[];
};

const FAQ_ITEMS: FAQItem[] = [
    {
        category: "Getting Started",
        title: "What is BiteBeacon?",
        content: [
            "BiteBeacon helps people discover street food vendors, burger vans, and food trucks nearby.",
            "The app combines vendor-managed listings with community spotting to build a stronger local food map.",
        ],
    },
    {
        category: "Getting Started",
        title: "How do I use the app?",
        content: [
            "Use the map to explore nearby vendors.",
            "Tap a vendor to open its listing, view details, check menus, get directions, save favourites, and leave ratings.",
            "Some features work without an account, while others require login.",
        ],
    },
    {
        category: "Getting Started",
        title: "Do I need an account?",
        content: [
            "No. You can browse the app without an account.",
            "Creating an account unlocks features such as favourites, ratings, and account-based tools.",
        ],
    },
    {
        category: "Accounts",
        title: "Forgot password",
        content: [
            "Use the reset option on the login screen.",
            "A password reset email can be sent to the account email address.",
        ],
    },
    {
        category: "Accounts",
        title: "User accounts and vendor accounts",
        content: [
            "BiteBeacon supports both standard user accounts and vendor accounts.",
            "User accounts are for discovery, favourites, and ratings.",
            "Vendor accounts are for claiming and managing listings.",
        ],
    },
    {
        category: "Map & Discovery",
        title: "How the map works",
        content: [
            "The map shows vendors based on your current location and the visible map area.",
            "Zoom and position affect which listings are easiest to see.",
        ],
    },
    {
        category: "Map & Discovery",
        title: "What does Spot a Van mean?",
        content: [
            "Spot a Van allows users to add a vendor to the map when that vendor is not already listed.",
            "This helps BiteBeacon grow faster and makes local food discovery better for everyone.",
        ],
    },
    {
        category: "Map & Discovery",
        title: "How long does a spotted van stay listed?",
        content: [
            "Community-spotted vans are temporary.",
            "They are generally intended to remain visible for around 7 days unless claimed or otherwise managed within the platform.",
        ],
    },
    {
        category: "Map & Discovery",
        title: "What does Live mean?",
        content: [
            "A live vendor is actively marked as serving right now.",
            "Live status helps users quickly find vendors that are available in real time.",
        ],
    },
    {
        category: "Map & Discovery",
        title: "Why might a vendor not appear?",
        content: [
            "A vendor may not appear if it is outside your current map view, not currently live, expired as a temporary spotted listing, or otherwise unavailable.",
        ],
    },
    {
        category: "Map & Discovery",
        title: "How accurate are listings?",
        content: [
            "Some listings are managed directly by vendors, while others may begin as community-spotted listings.",
            "Vendor-managed listings are usually more up to date than community-spotted listings, but details can still change.",
            "Details such as location, timing, menu items, and live status may change, so users should always use their own judgment before travelling.",
        ],
    },
    {
        category: "Map & Discovery",
        title: "What do views mean?",
        content: [
            "Views show how many times a vendor listing has been opened.",
            "To help prevent misuse, repeated views in a short period may not always be counted again immediately.",
        ],
    },
    {
        category: "Map & Discovery",
        title: "What do directions mean?",
        content: [
            "Directions show how many times users have requested navigation to that vendor.",
            "This helps vendors understand real visit intent and listing engagement.",
        ],
    },
    {
        category: "Map & Discovery",
        title: "How do ratings work?",
        content: [
            "Users can rate vendors using a star rating system.",
            "Ratings are averaged and may only be shown once enough ratings exist to make the display fair and more reliable.",
        ],
    },
    {
        category: "Map & Discovery",
        title: "How do favourites work?",
        content: [
            "Users can save vendors to favourites for easier access later.",
            "Favourites are tied to the logged-in user account.",
        ],
    },
    {
        category: "Vendors",
        title: "How do vendor listings work?",
        content: [
            "Vendors can manage listing details such as business name, cuisine, menu, schedule, photos, and visibility.",
            "Some listing tools depend on subscription tier.",
        ],
    },
    {
        category: "Vendors",
        title: "Can vendors claim community-spotted vans?",
        content: [
            "Yes. Vendors can claim eligible spotted listings and take control of them.",
            "Once claimed, the listing can be managed directly by the vendor.",
        ],
    },
    {
        category: "Vendors",
        title: "What happens when a subscription changes?",
        content: [
            "The timing and effect of upgrades, downgrades, cancellations, and renewals are shown during the relevant billing or subscription-management flow.",
            "When a subscription tier changes, the vendor listing will operate under the features available to the active tier.",
            "Vendor listing data is not automatically deleted purely because of a downgrade.",
        ],
    },
    {
        category: "Vendors",
        title: "Can a vendor be suspended?",
        content: [
            "Yes. BiteBeacon may suspend or restrict listings where needed for moderation, platform integrity, safety, or policy reasons.",
        ],
    },
    {
        category: "Billing",
        title: "How are subscriptions processed?",
        content: [
            "Vendor subscriptions are processed securely through Stripe.",
            "BiteBeacon does not store full payment card details directly in the app.",
        ],
    },
    {
        category: "Billing",
        title: "Do subscriptions renew automatically?",
        content: [
            "Yes, subscriptions generally renew automatically unless cancelled.",
            "Vendors should review and manage billing carefully.",
        ],
    },
    {
        category: "Billing",
        title: "Are payments refundable?",
        content: [
            "Refunds and cancellation rights depend on the circumstances, the applicable billing terms, and any rights provided by law.",
            "If you believe there has been a billing error, please contact support so it can be reviewed.",
        ],
    },
    {
        category: "Support",
        title: "How do I contact support?",
        content: [
            `Support email: ${SUPPORT_EMAIL}`,
            "Please include as much useful detail as possible, such as the issue, the screen you were on, and whether you were using the app as a guest, user, or vendor.",
            "Support response times can vary depending on request volume.",
        ],
    },

    {
        category: "Support",
        title: "Report an issue",
        content: [
            "If something is not working correctly, you can report it directly to support.",
            "This opens your email app with a pre-filled issue template to make reporting easier.",
            "Please do not include sensitive payment information in support emails.",
        ],
    },
    {
        category: "Support",
        title: "What should I contact support about?",
        content: [
            "Account access or login issues",
            "Vendor listing problems",
            "Subscription or billing questions",
            "Community spotted van concerns",
            "General BiteBeacon support",
        ],
    },
];

function FAQCard({ item }: { item: FAQItem }) {
    const [open, setOpen] = useState(false);

    return (
        <View style={[styles.faqCard, open && styles.faqCardOpen]}>
            <Pressable
                style={({ pressed }) => [
                    styles.faqHeader,
                    pressed && styles.faqHeaderPressed,
                ]}
                onPress={() => setOpen((current) => !current)}
                accessibilityRole="button"
                accessibilityState={{ expanded: open }}
                accessibilityLabel={`${item.title}. ${open ? "Collapse" : "Expand"} answer`}
            >
                <Text style={styles.faqTitle}>{item.title}</Text>

                <View style={[styles.faqIconWrap, open && styles.faqIconWrapOpen]}>
                    <Text style={styles.faqIcon}>{open ? "−" : "+"}</Text>
                </View>
            </Pressable>

            {open ? (
                <View style={styles.faqBody}>
                    <View style={styles.faqDivider} />

                    {item.content.map((line, index) => (
                        <View key={`${item.title}-${index}`} style={styles.answerRow}>
                            <View style={styles.answerBullet} />
                            <Text style={styles.faqText}>{line}</Text>
                        </View>
                    ))}
                </View>
            ) : null}
        </View>
    );
}

export default function HelpScreen() {
    const [searchQuery, setSearchQuery] = useState("");

    async function handleContactSupport() {
        const mailtoUrl = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
            "BiteBeacon Support Request"
        )}`;

        try {
            await Linking.openURL(mailtoUrl);
        } catch {
            // no-op for now
        }
    }

    async function handleReportIssue() {
        const subject = encodeURIComponent("BiteBeacon Issue Report");

        const body = encodeURIComponent(
            `Please describe the issue:\n\n` +
            `What happened:\n\n` +
            `Where did it happen (screen/vendor):\n\n` +
            `Steps to reproduce:\n\n` +
            `Device:\n\n`
        );

        const mailtoUrl = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;

        try {
            await Linking.openURL(mailtoUrl);
        } catch {
            // no-op for now
        }
    }

    const filteredItems = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();

        if (!query) return FAQ_ITEMS;

        return FAQ_ITEMS.filter((item) => {
            const inCategory = item.category.toLowerCase().includes(query);
            const inTitle = item.title.toLowerCase().includes(query);
            const inContent = item.content.some((line) =>
                line.toLowerCase().includes(query)
            );

            return inCategory || inTitle || inContent;
        });
    }, [searchQuery]);

    const groupedItems = useMemo(() => {
        const groups: Record<FAQItem["category"], FAQItem[]> = {
            "Getting Started": [],
            "Map & Discovery": [],
            Accounts: [],
            Vendors: [],
            Billing: [],
            Support: [],
        };

        filteredItems.forEach((item) => {
            groups[item.category].push(item);
        });

        return groups;
    }, [filteredItems]);

    return (
        <View style={styles.screen}>
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.hero}>
                    <Text style={styles.kicker}>SUPPORT</Text>
                    <Text style={styles.title}>Help & FAQ</Text>
                    <Text style={styles.subtitle}>
                        Find answers about BiteBeacon, vendor listings, the map,
                        subscriptions, billing, and account support.
                    </Text>
                </View>

                <View style={styles.searchWrap}>
                    <View style={styles.searchIconWrap}>
                        <Text style={styles.searchIcon}>⌕</Text>
                    </View>

                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search help topics"
                        placeholderTextColor="rgba(255,255,255,0.38)"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        selectionColor="#F4B547"
                        returnKeyType="search"
                        accessibilityLabel="Search help topics"
                    />

                    {searchQuery.length > 0 ? (
                        <Pressable
                            style={styles.clearButton}
                            onPress={() => setSearchQuery("")}
                            accessibilityRole="button"
                            accessibilityLabel="Clear help search"
                        >
                            <Text style={styles.clearButtonText}>×</Text>
                        </Pressable>
                    ) : null}
                </View>

                <View style={styles.supportHero}>
                    <View style={styles.supportTopRow}>
                        <View style={styles.supportBadge}>
                            <Text style={styles.supportBadgeText}>HELP</Text>
                        </View>

                        <View style={styles.supportHeading}>
                            <Text style={styles.supportHeroTitle}>Need direct help?</Text>
                            <Text style={styles.supportHeroText}>
                                If you cannot find the answer here, contact BiteBeacon
                                support and we will review your issue.
                            </Text>
                        </View>
                    </View>

                    <View style={styles.emailBox}>
                        <Text style={styles.emailLabel}>SUPPORT EMAIL</Text>
                        <Text style={styles.emailValue}>{SUPPORT_EMAIL}</Text>
                    </View>

                    <Pressable
                        style={({ pressed }) => [
                            styles.primaryButton,
                            pressed && styles.buttonPressed,
                        ]}
                        onPress={handleContactSupport}
                    >
                        <Text style={styles.primaryButtonText}>Email Support</Text>
                    </Pressable>

                    <Pressable
                        style={({ pressed }) => [
                            styles.secondaryButton,
                            pressed && styles.buttonPressed,
                        ]}
                        onPress={handleReportIssue}
                    >
                        <Text style={styles.secondaryButtonText}>Report an Issue</Text>
                    </Pressable>
                </View>

                {(
                    [
                        "Getting Started",
                        "Map & Discovery",
                        "Accounts",
                        "Vendors",
                        "Billing",
                        "Support",
                    ] as FAQItem["category"][]
                ).map((category) =>
                    groupedItems[category].length > 0 ? (
                        <View key={category} style={styles.categoryBlock}>
                            <Text style={styles.categoryTitle}>{category}</Text>

                            <View style={styles.categoryCards}>
                                {groupedItems[category].map((item) => (
                                    <FAQCard key={item.title} item={item} />
                                ))}
                            </View>
                        </View>
                    ) : null
                )}

                {filteredItems.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateKicker}>NO RESULTS</Text>
                        <Text style={styles.emptyStateTitle}>
                            No matching help topics
                        </Text>
                        <Text style={styles.emptyStateText}>
                            Try a different search term or contact BiteBeacon support
                            directly.
                        </Text>
                    </View>
                ) : null}

                <Pressable
                    style={({ pressed }) => [
                        styles.backButton,
                        pressed && styles.backButtonPressed,
                    ]}
                    onPress={() => router.back()}
                    accessibilityRole="button"
                    accessibilityLabel="Go back"
                >
                    <Text style={styles.backButtonText}>Back</Text>
                </Pressable>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: "#07131F",
    },

    container: {
        flex: 1,
    },

    content: {
        paddingHorizontal: 20,
        paddingTop: 24,
        paddingBottom: 40,
    },

    hero: {
        marginBottom: 18,
    },

    kicker: {
        fontSize: 11,
        fontWeight: "900",
        color: "#F4B547",
        letterSpacing: 1.8,
        marginBottom: 8,
    },

    title: {
        fontSize: 31,
        lineHeight: 36,
        fontWeight: "900",
        letterSpacing: -0.6,
        color: "#FFFFFF",
        marginBottom: 10,
    },

    subtitle: {
        maxWidth: 540,
        fontSize: 15,
        lineHeight: 22,
        fontWeight: "600",
        color: "rgba(255,255,255,0.68)",
    },

    searchWrap: {
        minHeight: 56,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(14,29,45,0.98)",
        borderRadius: 18,
        borderWidth: 1,
        borderColor: "rgba(244,181,71,0.32)",
        paddingHorizontal: 12,
        marginBottom: 16,
    },

    searchIconWrap: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(244,181,71,0.08)",
        borderWidth: 1,
        borderColor: "rgba(244,181,71,0.22)",
        marginRight: 9,
    },

    searchIcon: {
        color: "#F4B547",
        fontSize: 22,
        lineHeight: 24,
        fontWeight: "700",
        marginTop: -2,
    },

    searchInput: {
        flex: 1,
        minHeight: 54,
        color: "#FFFFFF",
        fontSize: 15,
        fontWeight: "600",
        paddingVertical: 0,
    },

    clearButton: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: "center",
        justifyContent: "center",
    },

    clearButtonText: {
        color: "rgba(255,255,255,0.58)",
        fontSize: 24,
        lineHeight: 26,
    },

    supportHero: {
        backgroundColor: "rgba(14,29,45,0.98)",
        borderWidth: 1,
        borderColor: "rgba(244,181,71,0.42)",
        borderRadius: 22,
        padding: 16,
        marginBottom: 24,
        shadowColor: "#000000",
        shadowOpacity: 0.22,
        shadowRadius: 14,
        shadowOffset: {
            width: 0,
            height: 6,
        },
        elevation: 6,
    },

    supportTopRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        marginBottom: 14,
    },

    supportBadge: {
        minWidth: 50,
        height: 32,
        borderRadius: 16,
        paddingHorizontal: 10,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(244,181,71,0.1)",
        borderWidth: 1,
        borderColor: "rgba(244,181,71,0.4)",
    },

    supportBadgeText: {
        color: "#F4B547",
        fontSize: 10,
        fontWeight: "900",
        letterSpacing: 1,
    },

    supportHeading: {
        flex: 1,
    },

    supportHeroTitle: {
        fontSize: 17,
        fontWeight: "900",
        color: "#FFFFFF",
        marginBottom: 5,
    },

    supportHeroText: {
        fontSize: 13,
        lineHeight: 19,
        fontWeight: "600",
        color: "rgba(255,255,255,0.62)",
    },

    emailBox: {
        backgroundColor: "rgba(255,255,255,0.035)",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
        paddingHorizontal: 14,
        paddingVertical: 13,
        marginBottom: 12,
    },

    emailLabel: {
        fontSize: 10,
        fontWeight: "900",
        color: "#F4B547",
        marginBottom: 5,
        letterSpacing: 1.3,
    },

    emailValue: {
        fontSize: 15,
        fontWeight: "800",
        color: "#FFFFFF",
    },

    primaryButton: {
        minHeight: 50,
        backgroundColor: "#FF7A00",
        borderRadius: 15,
        borderWidth: 1,
        borderColor: "#FFB24D",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 16,
        shadowColor: "#FF7A00",
        shadowOpacity: 0.2,
        shadowRadius: 10,
        shadowOffset: {
            width: 0,
            height: 4,
        },
        elevation: 5,
    },

    primaryButtonText: {
        color: "#FFFFFF",
        fontSize: 15,
        fontWeight: "900",
    },

    secondaryButton: {
        minHeight: 50,
        marginTop: 10,
        backgroundColor: "rgba(244,181,71,0.07)",
        borderRadius: 15,
        borderWidth: 1,
        borderColor: "rgba(244,181,71,0.5)",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 16,
    },

    secondaryButtonText: {
        color: "#F4B547",
        fontSize: 15,
        fontWeight: "900",
    },

    buttonPressed: {
        opacity: 0.82,
    },

    categoryBlock: {
        marginBottom: 22,
    },

    categoryTitle: {
        fontSize: 11,
        fontWeight: "900",
        color: "#F4B547",
        letterSpacing: 1.6,
        textTransform: "uppercase",
        marginBottom: 10,
    },

    categoryCards: {
        gap: 10,
    },

    faqCard: {
        overflow: "hidden",
        backgroundColor: "rgba(14,29,45,0.96)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
        borderRadius: 20,
    },

    faqCardOpen: {
        backgroundColor: "rgba(13,28,44,0.99)",
        borderColor: "rgba(244,181,71,0.46)",
        shadowColor: "#F4B547",
        shadowOpacity: 0.08,
        shadowRadius: 10,
        shadowOffset: {
            width: 0,
            height: 4,
        },
        elevation: 3,
    },

    faqHeader: {
        minHeight: 70,
        paddingHorizontal: 16,
        paddingVertical: 13,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
    },

    faqHeaderPressed: {
        backgroundColor: "rgba(255,255,255,0.025)",
    },

    faqTitle: {
        flex: 1,
        fontSize: 16,
        fontWeight: "900",
        color: "#FFFFFF",
        lineHeight: 21,
    },

    faqIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(244,181,71,0.06)",
        borderWidth: 1,
        borderColor: "rgba(244,181,71,0.34)",
    },

    faqIconWrapOpen: {
        backgroundColor: "rgba(244,181,71,0.13)",
        borderColor: "rgba(244,181,71,0.68)",
    },

    faqIcon: {
        width: 22,
        textAlign: "center",
        fontSize: 21,
        lineHeight: 23,
        fontWeight: "700",
        color: "#F4B547",
    },

    faqBody: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },

    faqDivider: {
        height: 1,
        backgroundColor: "rgba(244,181,71,0.16)",
        marginBottom: 14,
    },

    answerRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 10,
        marginBottom: 10,
    },

    answerBullet: {
        width: 6,
        height: 6,
        borderRadius: 999,
        backgroundColor: "#F4B547",
        marginTop: 7,
    },

    faqText: {
        flex: 1,
        fontSize: 14,
        lineHeight: 21,
        fontWeight: "600",
        color: "rgba(255,255,255,0.74)",
    },

    emptyState: {
        backgroundColor: "rgba(14,29,45,0.98)",
        borderWidth: 1,
        borderColor: "rgba(244,181,71,0.3)",
        borderRadius: 20,
        padding: 17,
        marginBottom: 20,
    },

    emptyStateKicker: {
        color: "#F4B547",
        fontSize: 10,
        fontWeight: "900",
        letterSpacing: 1.4,
        marginBottom: 5,
    },

    emptyStateTitle: {
        fontSize: 17,
        fontWeight: "900",
        color: "#FFFFFF",
        marginBottom: 5,
    },

    emptyStateText: {
        fontSize: 13,
        lineHeight: 19,
        fontWeight: "600",
        color: "rgba(255,255,255,0.6)",
    },

    backButton: {
        minHeight: 48,
        marginTop: 2,
        borderRadius: 15,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(255,255,255,0.06)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.12)",
    },

    backButtonPressed: {
        backgroundColor: "rgba(255,255,255,0.1)",
    },

    backButtonText: {
        color: "rgba(255,255,255,0.8)",
        fontSize: 14,
        fontWeight: "800",
    },
});
