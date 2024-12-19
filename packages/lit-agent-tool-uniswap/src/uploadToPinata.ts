export async function uploadToPinata(pinataJwt: string, data: string) {
  const formData = new FormData();

  const blob = new Blob([data], { type: "text/plain" });
  formData.append("file", blob, "litAction.js");

  const pinataMetadata = JSON.stringify({
    name: "Uniswap Swap Lit Action",
  });
  formData.append("pinataMetadata", pinataMetadata);

  const pinataOptions = JSON.stringify({
    cidVersion: 0,
  });
  formData.append("pinataOptions", pinataOptions);

  const pinataResponse = await fetch(
    "https://api.pinata.cloud/pinning/pinFileToIPFS",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${pinataJwt}`,
      },
      body: formData,
    }
  );

  if (!pinataResponse.ok) {
    throw new Error(`Pinata upload failed: ${pinataResponse.status}`);
  }

  return await pinataResponse.json();
}
