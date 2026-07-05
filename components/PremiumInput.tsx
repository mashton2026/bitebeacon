import { StyleSheet, TextInput, TextInputProps } from "react-native";

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
        paddingVertical: 16,
        marginBottom: 20,

        color: "#FFFFFF",

        fontSize: 16,
    },
});