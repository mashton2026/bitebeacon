import { StyleSheet, TextInput, TextInputProps } from "react-native";
import { typography } from "../constants/typography";
export default function PremiumInput(props: TextInputProps) {
    return (
        <TextInput
            {...props}
            placeholderTextColor="rgba(255,255,255,0.35)"
            style={[styles.input, props.style]}
        />
    );
}

const styles = StyleSheet.create({
    input: {
        backgroundColor: "rgba(18,22,28,0.96)",

        borderWidth: 1.5,
        borderColor: "#D67A1E",

        borderRadius: 16,

        paddingHorizontal: 18,
        paddingVertical: 10,
        marginBottom: 20,

        color: "#FFFFFF",
        fontFamily: typography.body,
        fontSize: 16,
    },
});