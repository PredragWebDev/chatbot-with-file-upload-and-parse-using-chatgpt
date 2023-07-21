
// Creates a ConversationalRetrievalQAChain object that uses an OpenAI model and a PineconeStore vectorstore
export const baseUrl = () => {
  const { hostname } = window.location;
  const isDomain = !/^(localhost|(\d{1,3}\.){3}\d{1,3})$/.test(hostname);

  if (isDomain) {
    const domainName = window.location.protocol + "//" + window.location.hostname;
    return domainName;
  } else {
    const baseUrl = window.location.origin;
    return baseUrl;
  }
};
