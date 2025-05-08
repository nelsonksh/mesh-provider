// Step #1
// Import Mesh SDK and UTxO RPC provider
import { MeshWallet, serializePlutusScript, MeshTxBuilder } from "@meshsdk/core";
import { U5CProvider } from "../src";
import { PlutusScript } from "@meshsdk/common";
import { CSLSerializer } from "@meshsdk/core-csl";

const demoPlutusAlwaysSucceedScript = "4e4d01000033222220051200120011";
const script: PlutusScript = {
    code: demoPlutusAlwaysSucceedScript,
    version: "V2",
};
const { address: scriptAddress } = serializePlutusScript(script);


async function main() {

    // Step #2
    // Create a new U5C provider
    const provider = new U5CProvider({
        url: "https://preprod.utxorpc-v0.demeter.run:443",
        headers: {
            "dmtr-api-key": "dmtr_utxorpc...",
        },
    });

    // Step #3
    // Create a new wallet from a mnemonic
    const wallet = new MeshWallet({
        networkId: 0, // 0: testnet, 1: mainnet
        fetcher: provider,
        submitter: provider,
        key: {
            type: 'mnemonic',
            words: ["solution", "solution", "solution", "solution", "solution", "solution", "solution", "solution", "solution", "solution", "solution", "solution", "solution", "solution", "solution", "solution", "solution", "solution", "solution", "solution", "solution", "solution", "solution", "solution"],
        },
    });

    // Optional: Print the wallet address
    const changeAddress = await wallet.getChangeAddress();
    console.log("change address: ", changeAddress)
    console.log("always succeed script address: ", scriptAddress)

    // // Optional: Print the wallet utxos
    const utxos = await wallet.getUtxos();
    const collateral = await wallet.getCollateral();
    // console.log(await provider.fetchAddressUTxOs(changeAddress))
    const script_utxos = await provider.fetchAddressUTxOs(scriptAddress);
    const first_only_ada_utxo = script_utxos.find((utxo) => utxo.output.amount.length === 1)
    console.log("first only ada utxo: ", first_only_ada_utxo)

    // // Step #4
    // // Create an example transaction that gets the ADA to the mesh solution address

    const txBuilder = new MeshTxBuilder({
        fetcher: provider,
        evaluator: provider,
        submitter: provider,
        verbose: true,
        serializer: new CSLSerializer(),
    })

    const unsignedTx = await txBuilder
        .spendingPlutusScriptV2()
        .txIn(first_only_ada_utxo!.input.txHash, first_only_ada_utxo!.input.outputIndex)
        .txInInlineDatumPresent()
        .txInRedeemerValue(0)
        .txInScript(demoPlutusAlwaysSucceedScript)
        .changeAddress(changeAddress)
        .txInCollateral(
            collateral[0]?.input.txHash!,
            collateral[0]?.input.outputIndex!,
            collateral[0]?.output.amount!,
            collateral[0]?.output.address!,
        )
        .selectUtxosFrom(utxos)
        .complete();

    console.log("unsigned tx: ", unsignedTx);

    // Step #5
    // Sign the transaction
    const signedTx = await wallet.signTx(unsignedTx);
    console.log("signed tx: ", signedTx);

    // Step #6
    // Submit the transaction to the blockchain network
    const txId = await provider.submitTx(signedTx);

    // Optional: Print the transaction ID
    console.log("Transaction ID", txId);
}

main().catch(console.error);