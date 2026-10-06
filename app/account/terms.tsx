import { router } from "expo-router";
import { useState } from "react";
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

const COMPANY_NAME = "BITEBEACON LTD";
const COMPANY_NUMBER = "17089061";
const TRADING_NAME = "BiteBeacon";
const DIRECTOR_NAME = "Matthew Ashton";
const CONTACT_EMAIL = "support@bitebeacon.uk";
const EFFECTIVE_DATE = "Effective: October 2026";

type Section = {
  title: string;
  content: string[];
};

const SECTIONS: Section[] = [
  {
    title: "Who We Are",
    content: [
      `${TRADING_NAME} is operated by ${COMPANY_NAME}, a company registered in the United Kingdom.`,
      `Company Number: ${COMPANY_NUMBER}`,
      `Director: ${DIRECTOR_NAME}`,
      `Contact: ${CONTACT_EMAIL}`,
    ],
  },
  {
    title: "Using BiteBeacon",
    content: [
      "BiteBeacon helps users discover food vendors and allows eligible vendors to create, claim, and manage listings.",
      "You agree to use the platform lawfully and not misuse, disrupt, or interfere with the service.",
      "You must not use BiteBeacon for fraudulent, misleading, abusive, or unlawful activity.",
    ],
  },
  {
    title: "Accounts & Security",
    content: [
      "You are responsible for keeping your account details and access secure.",
      "You must not access another person's account without permission.",
      "We may restrict or suspend access where reasonably necessary to protect users, accounts, or the platform.",
    ],
  },
  {
    title: "Vendor Listings",
    content: [
      "Vendors are responsible for keeping the information they control accurate and reasonably up to date.",
      "This may include menus, pricing, location, availability, opening information, photos, and other listing content.",
      "Vendors must only create, claim, or manage listings they own or are authorised to control.",
      "Vendor listings may be reviewed, approved, suspended, or removed where reasonably necessary for moderation, safety, accuracy, or platform integrity.",
    ],
  },
  {
    title: "Community Spotted Listings",
    content: [
      "BiteBeacon allows users to submit community-spotted vendor locations.",
      "Community-spotted listings may be unclaimed, unverified, temporary, pending review, or based on information supplied by users.",
      "A community-spotted listing should not be treated as confirmation that a vendor is currently trading at that location.",
      "Eligible vendors may be able to claim a listing through BiteBeacon's claim and verification process.",
    ],
  },
  {
    title: "Listing Accuracy",
    content: [
      "Vendor locations, opening information, menus, availability, LIVE status, and other listing details can change.",
      "We do not guarantee that every listing or map location will always be complete, accurate, or up to date.",
      "Users should verify important information directly with the vendor where necessary before relying on it.",
    ],
  },
  {
    title: "Ratings & User Content",
    content: [
      "Users may submit ratings, reports, confirmations, photos, and other permitted interactions or content.",
      "You are responsible for content you submit and must not knowingly submit unlawful, abusive, misleading, infringing, or fraudulent material.",
      "Manipulating ratings, confirmations, reports, or other community features is not allowed.",
      "We may review, moderate, restrict, or remove user-submitted content where reasonably necessary.",
    ],
  },
  {
    title: "Subscriptions & Payments",
    content: [
      "Some vendor features and visibility options may require a paid subscription.",
      "Available plans, prices, included features, and any promotional or launch benefits will be shown in BiteBeacon before purchase.",
      "Subscriptions may renew automatically unless cancelled in accordance with the billing terms shown at purchase or in the subscription management portal.",
      "Payments and subscription management are processed through third-party payment services such as Stripe.",
      "You are responsible for keeping your billing information accurate and for managing your subscription through the options provided.",
    ],
  },
  {
    title: "Subscription Changes",
    content: [
      "The timing and effect of upgrades, downgrades, cancellations, renewals, and other subscription changes will be shown during the relevant billing or subscription-management flow.",
      "The features available to a vendor may change when their active subscription tier changes.",
      "Nothing in these terms limits any cancellation, refund, or other rights you may have under applicable law.",
    ],
  },
  {
    title: "Intellectual Property",
    content: [
      "The BiteBeacon name, branding, app design, software, and other intellectual property owned by BITEBEACON LTD remain the property of BITEBEACON LTD.",
      "Content owned by users, vendors, or third parties remains subject to their respective rights.",
      "You must not copy, reproduce, distribute, or reverse engineer BiteBeacon except where permitted by law or with our permission.",
    ],
  },
  {
    title: "Third-Party Services",
    content: [
      "BiteBeacon relies on third-party services for functions such as maps, hosting, authentication, storage, and payments.",
      "The availability or performance of BiteBeacon may sometimes be affected by services outside our direct control.",
      "Any third-party services you use may also be subject to their own terms and privacy practices.",
    ],
  },
  {
    title: "Limitation of Liability",
    content: [
      "BiteBeacon provides discovery and listing information, and users remain responsible for decisions they make based on that information.",
      "To the extent permitted by law, BITEBEACON LTD is not responsible for indirect or unforeseeable losses arising from use of the platform.",
      "We are not responsible for a vendor's products, services, conduct, availability, or information supplied independently by that vendor or by other users.",
      "Nothing in these terms excludes or limits liability where it would be unlawful to do so or affects rights that cannot legally be excluded.",
    ],
  },
  {
    title: "Suspension & Termination",
    content: [
      "We may suspend, restrict, or remove accounts, listings, content, or access where reasonably necessary.",
      "This may include action taken for safety, moderation, suspected misuse, legal requirements, policy breaches, fraud prevention, or platform integrity.",
      "You may stop using BiteBeacon at any time.",
    ],
  },
  {
    title: "Changes to the Service",
    content: [
      "We may update, improve, remove, or change parts of BiteBeacon as the service develops.",
      "Where a change materially affects a paid service, we will handle it in accordance with applicable law and any relevant subscription terms.",
    ],
  },
  {
    title: "Changes to These Terms",
    content: [
      "We may update these terms when the service, our legal obligations, or our business practices change.",
      "Where required, we will provide reasonable notice of material changes.",
      "Updated terms will apply from the effective date shown, subject to applicable law.",
    ],
  },
  {
    title: "Your Legal Rights",
    content: [
      "These terms do not remove or reduce any rights that you have under applicable consumer or other mandatory law.",
      "If any part of these terms is found to be unenforceable, the remaining terms will continue to apply where legally permitted.",
    ],
  },
  {
    title: "Governing Law",
    content: [
      "These terms are governed by the laws of England and Wales, subject to any mandatory rights that may apply to you.",
    ],
  },
  {
    title: "Contact",
    content: [
      `For support or legal enquiries, contact ${CONTACT_EMAIL}.`,
    ],
  },
];

function SectionCard({ section }: { section: Section }) {
  const [open, setOpen] = useState(false);

  return (
    <View style={[styles.card, open && styles.cardOpen]}>
      <Pressable
        style={({ pressed }) => [
          styles.header,
          pressed && styles.headerPressed,
        ]}
        onPress={() => setOpen((current) => !current)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${section.title}. ${open ? "Collapse" : "Expand"} section`}
      >
        <Text style={styles.sectionTitle}>{section.title}</Text>

        <View style={[styles.iconWrap, open && styles.iconWrapOpen]}>
          <Text style={[styles.icon, open && styles.iconOpen]}>
            {open ? "−" : "+"}
          </Text>
        </View>
      </Pressable>

      {open ? (
        <View style={styles.body}>
          <View style={styles.divider} />

          {section.content.map((line, index) => (
            <View key={`${section.title}-${index}`} style={styles.bodyRow}>
              <View style={styles.bullet} />
              <Text style={styles.bodyText}>{line}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export default function TermsScreen() {
  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Text style={styles.kicker}>LEGAL</Text>
          <Text style={styles.title}>Terms & Conditions</Text>
          <Text style={styles.subtitle}>
            Clear information about using BiteBeacon, vendor listings,
            subscriptions, community content, and your rights.
          </Text>

          <View style={styles.effectivePill}>
            <View style={styles.effectiveDot} />
            <Text style={styles.effective}>{EFFECTIVE_DATE}</Text>
          </View>
        </View>

        <View style={styles.introCard}>
          <Text style={styles.introTitle}>BiteBeacon terms at a glance</Text>
          <Text style={styles.introText}>
            Tap any section below to read the details. We have kept the wording
            as clear and straightforward as possible.
          </Text>
        </View>

        <View style={styles.sections}>
          {SECTIONS.map((section) => (
            <SectionCard key={section.title} section={section} />
          ))}
        </View>

        <View style={styles.companyCard}>
          <Text style={styles.companyKicker}>OPERATED BY</Text>
          <Text style={styles.companyName}>{COMPANY_NAME}</Text>
          <Text style={styles.companyMeta}>
            Company No. {COMPANY_NUMBER} · {CONTACT_EMAIL}
          </Text>
        </View>

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
    letterSpacing: 1.8,
    color: "#F4B547",
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
    marginBottom: 14,
  },

  effectivePill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
    backgroundColor: "rgba(244,181,71,0.08)",
    borderWidth: 1,
    borderColor: "rgba(244,181,71,0.28)",
  },

  effectiveDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: "#F4B547",
  },

  effective: {
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(255,255,255,0.72)",
  },

  introCard: {
    backgroundColor: "rgba(14,29,45,0.96)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(244,181,71,0.26)",
    padding: 16,
    marginBottom: 18,
  },

  introTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 5,
  },

  introText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600",
  },

  sections: {
    gap: 10,
  },

  card: {
    overflow: "hidden",
    backgroundColor: "rgba(14,29,45,0.96)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },

  cardOpen: {
    borderColor: "rgba(244,181,71,0.46)",
    backgroundColor: "rgba(13,28,44,0.99)",
    shadowColor: "#F4B547",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 4,
  },

  header: {
    minHeight: 70,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },

  headerPressed: {
    backgroundColor: "rgba(255,255,255,0.025)",
  },

  sectionTitle: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "900",
  },

  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(244,181,71,0.06)",
    borderWidth: 1,
    borderColor: "rgba(244,181,71,0.34)",
  },

  iconWrapOpen: {
    backgroundColor: "rgba(244,181,71,0.13)",
    borderColor: "rgba(244,181,71,0.68)",
  },

  icon: {
    color: "#F4B547",
    fontSize: 21,
    lineHeight: 23,
    fontWeight: "700",
  },

  iconOpen: {
    color: "#FFD778",
  },

  body: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },

  divider: {
    height: 1,
    backgroundColor: "rgba(244,181,71,0.16)",
    marginBottom: 14,
  },

  bodyRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 10,
  },

  bullet: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: "#F4B547",
    marginTop: 7,
  },

  bodyText: {
    flex: 1,
    color: "rgba(255,255,255,0.74)",
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "600",
  },

  companyCard: {
    marginTop: 20,
    backgroundColor: "rgba(10,24,38,0.98)",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(244,181,71,0.2)",
  },

  companyKicker: {
    color: "#F4B547",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginBottom: 5,
  },

  companyName: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 4,
  },

  companyMeta: {
    color: "rgba(255,255,255,0.56)",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600",
  },

  backButton: {
    minHeight: 48,
    marginTop: 12,
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
