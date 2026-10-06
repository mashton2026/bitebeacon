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
    title: "What Data We Collect",
    content: [
      "We may collect account information such as your email address, account identifier, and information needed to provide and secure your account.",
      "We may collect vendor listing information such as business names, locations, menus, schedules, photos, social links, and other information submitted for a listing.",
      "We may collect information about how you interact with BiteBeacon, including favourites, ratings, listing views, direction requests, confirmations, reports, and other in-app interactions.",
      "When a community-spotted listing is submitted, we may collect the vendor and location information supplied by the user.",
      "We may collect information submitted through vendor claims, reports, account deletion requests, and other user or vendor submissions.",
      "Where you choose to use location-based features, BiteBeacon may process your device location to provide nearby discovery and map functionality.",
    ],
  },
  {
    title: "How We Use Data",
    content: [
      "To provide, operate, maintain, and improve BiteBeacon.",
      "To authenticate users and provide account functionality.",
      "To show nearby vendors, maps, listings, and other location-based discovery features.",
      "To allow users to save favourites, submit ratings, confirm community-spotted listings, request directions, and use other BiteBeacon features.",
      "To allow vendors to create, claim, manage, and promote their listings and to provide subscription-related features.",
      "To review reports, ownership claims, account deletion requests, moderation issues, suspected misuse, and other platform integrity matters.",
      "To provide support and respond to enquiries.",
    ],
  },
  {
    title: "Legal Basis (UK GDPR)",
    content: [
      "Where UK data protection law applies, we process personal data only where we have an appropriate lawful basis.",
      "We may process information because it is necessary to provide a service or feature you have requested or to perform our agreement with you.",
      "We may rely on our legitimate interests where reasonably necessary to operate, secure, improve, moderate, and protect BiteBeacon, provided those interests are not overridden by your rights and interests.",
      "We may rely on consent where consent is specifically requested and is the appropriate lawful basis. You may withdraw that consent where applicable.",
      "We may process information where necessary to comply with a legal obligation.",
    ],
  },
  {
    title: "Location Data",
    content: [
      "BiteBeacon may request permission to access your device location so that it can show nearby vendors and provide map and discovery features.",
      "Location permission is controlled through your device and can be refused or disabled in your device settings.",
      "Some BiteBeacon interactions may include location information where that information is needed for the feature, such as community-spotted vendor locations or location-related vendor interactions.",
      "If device location access is disabled, BiteBeacon can still be used, but some nearby and location-based features may be less accurate or useful.",
    ],
  },
  {
    title: "Vendor & Community Listings",
    content: [
      "Vendor listings may contain information submitted by vendors, BiteBeacon administrators, or members of the community.",
      "Some listings may begin as community-spotted listings before being claimed or verified by a vendor.",
      "Community-spotted listings may include a submitted location and other information about the vendor and may be temporary, unclaimed, or unverified.",
      "Information intended to form part of a public vendor listing may be visible to other BiteBeacon users.",
    ],
  },
  {
    title: "Ratings, Reports & Interactions",
    content: [
      "BiteBeacon may process ratings, favourites, confirmations, reports, listing views, direction requests, and other interactions needed to provide community and vendor features.",
      "Some interactions may be associated with your account or a vendor listing so that BiteBeacon can operate the feature, reduce misuse, and maintain platform integrity.",
      "Reports and claim requests may contain information you provide for review by BiteBeacon administrators.",
    ],
  },
  {
    title: "Payments & Subscriptions",
    content: [
      "Paid vendor subscriptions and billing are processed using third-party payment services such as Stripe.",
      "BiteBeacon does not store full payment card details directly in the app.",
      "We may store limited information needed to manage subscription access, such as a payment-provider customer reference, subscription status, and active subscription tier.",
      "Payment providers process payment information under their own privacy and security practices.",
    ],
  },
  {
    title: "Third-Party Services",
    content: [
      "BiteBeacon uses third-party service providers where necessary to operate the platform.",
      "Supabase is used for backend services including authentication, database functionality, and storage.",
      "Stripe is used for payment and subscription processing.",
      "BiteBeacon also relies on third-party technology for functions such as maps and app infrastructure.",
      "These providers may process limited information where necessary to provide their services to BiteBeacon.",
    ],
  },
  {
    title: "International Data Transfers",
    content: [
      "Some service providers may process or store personal data outside the United Kingdom.",
      "Where UK data protection law requires safeguards for an international transfer, we will rely on an appropriate lawful transfer mechanism or other permitted safeguard.",
    ],
  },
  {
    title: "Data Sharing",
    content: [
      "We do not sell your personal data.",
      "We may share personal data with service providers where reasonably necessary to operate BiteBeacon and provide its features.",
      "Information submitted for a public vendor listing may be displayed publicly as part of the BiteBeacon service.",
      "We may disclose information where required by law or where reasonably necessary to establish, exercise, or defend legal rights, prevent fraud or misuse, or protect users and the platform.",
    ],
  },
  {
    title: "Data Retention",
    content: [
      "We keep personal data only for as long as reasonably necessary for the purposes for which it was collected and for legitimate legal, security, operational, and dispute-resolution requirements.",
      "Different types of information may be retained for different periods depending on why the information is needed.",
      "When information is no longer required, we will delete it or otherwise handle it in accordance with applicable data protection requirements.",
    ],
  },
  {
    title: "Account Deletion",
    content: [
      "BiteBeacon provides a process for requesting account deletion.",
      "A deletion request does not necessarily require every record to be removed immediately where information must reasonably be retained for legal obligations, fraud prevention, security, dispute resolution, or other lawful purposes.",
      `If you need assistance with an account deletion or privacy request, contact ${CONTACT_EMAIL}.`,
    ],
  },
  {
    title: "Your Privacy Rights",
    content: [
      "Under UK data protection law, you may have rights relating to your personal data, depending on the circumstances.",
      "These may include rights to access personal data, correct inaccurate information, request erasure, restrict certain processing, object to certain processing, and receive certain information in a portable format.",
      "Where processing is based on consent, you may have the right to withdraw that consent.",
      "You also have the right to complain to the UK Information Commissioner's Office (ICO) if you believe your personal data has been handled in breach of data protection law.",
      `To exercise a privacy right or ask a privacy question, contact ${CONTACT_EMAIL}.`,
    ],
  },
  {
    title: "Security",
    content: [
      "We use reasonable technical and organisational measures designed to protect personal data and restrict inappropriate access.",
      "Access to administrative and account-related functions is restricted according to the permissions required to operate BiteBeacon.",
      "No internet-connected service can guarantee absolute security.",
    ],
  },
  {
    title: "Children",
    content: [
      "BiteBeacon is not designed specifically for children.",
      "If we become aware that personal data relating to a child has been collected in circumstances where it should not have been, we will take appropriate steps in accordance with applicable law.",
      `If you are a parent or guardian with a concern about a child's information, contact ${CONTACT_EMAIL}.`,
    ],
  },
  {
    title: "Automated Decision-Making",
    content: [
      "BiteBeacon does not currently use personal data to make solely automated decisions that produce legal or similarly significant effects on users.",
    ],
  },
  {
    title: "Changes to This Policy",
    content: [
      "We may update this Privacy Policy as BiteBeacon, our service providers, or our legal obligations change.",
      "Where appropriate, material changes will be communicated through BiteBeacon or another reasonable method.",
      "The effective date shown at the top of this policy identifies the current version.",
    ],
  },
  {
    title: "Contact",
    content: [
      `For privacy questions, requests, or concerns, contact ${CONTACT_EMAIL}.`,
      `${TRADING_NAME} is operated by ${COMPANY_NAME}, Company Number ${COMPANY_NUMBER}.`,
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
        accessibilityLabel={`${section.title}. ${
          open ? "Collapse" : "Expand"
        } section`}
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

export default function PrivacyScreen() {
  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Text style={styles.kicker}>LEGAL</Text>
          <Text style={styles.mainTitle}>Privacy Policy</Text>
          <Text style={styles.subtitle}>
            Clear information about the data BiteBeacon uses, why we use it, and
            the choices and rights available to you.
          </Text>

          <View style={styles.effectivePill}>
            <View style={styles.effectiveDot} />
            <Text style={styles.effective}>{EFFECTIVE_DATE}</Text>
          </View>
        </View>

        <View style={styles.introCard}>
          <Text style={styles.introTitle}>Your privacy at BiteBeacon</Text>
          <Text style={styles.introText}>
            Tap any section below to understand what information may be
            processed and how it supports the BiteBeacon service.
          </Text>
        </View>

        <View style={styles.sections}>
          {SECTIONS.map((section) => (
            <SectionCard key={section.title} section={section} />
          ))}
        </View>

        <View style={styles.companyCard}>
          <Text style={styles.companyKicker}>DATA CONTROLLER</Text>
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

  mainTitle: {
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
