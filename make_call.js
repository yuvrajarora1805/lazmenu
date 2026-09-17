require('dotenv').config();
const wrtc = require("@roamhq/wrtc");

const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_TOKEN; 
const TO = "917889142708"; // The number to call (must be registered in test numbers)

async function makeCall() {
    console.log("Setting up WebRTC connection...");
    const pc = new wrtc.RTCPeerConnection();

    // We need an audio transceiver for the WebRTC session.
    pc.addTransceiver("audio", {
        direction: "sendrecv"
    });

    pc.onicecandidate = (event) => {
        if (event.candidate) {
            console.log("ICE candidate generated.");
        }
    };

    pc.onconnectionstatechange = () => {
        console.log("WebRTC State Changed:", pc.connectionState);
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    // Wait briefly for ICE gathering.
    console.log("Gathering ICE candidates...");
    await new Promise(resolve => setTimeout(resolve, 3000));

    const sdp = pc.localDescription.sdp;

    console.log("Sending SDP Offer to Meta API...");

    const response = await fetch(
        `https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/calls`,
        {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${ACCESS_TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                messaging_product: "whatsapp",
                to: TO,
                action: "connect",
                session: {
                    sdp_type: "offer",
                    sdp: sdp
                }
            })
        }
    );

    const data = await response.json();

    console.log("Meta API Response:");
    console.log(JSON.stringify(data, null, 2));

    if (!response.ok) {
        console.error("Failed to connect call. Closing WebRTC...");
        await pc.close();
        return;
    }

    // Keep the WebRTC session alive.
    console.log("✅ Call request sent successfully! Phone should be ringing.");
    console.log("Keeping session alive. Press Ctrl+C to hang up.");

    setInterval(() => {}, 1000);
}

makeCall().catch(console.error);
