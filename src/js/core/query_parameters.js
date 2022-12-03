const options = Object.fromEntries(new URLSearchParams(location.search).entries());

export let queryParamOptions = {
    embedProvider: null,
    abtVariant: null,
    campaign: null,
    fbclid: null,
    gclid: null,
};

if (options.embed) {
    queryParamOptions.embedProvider = options.embed;
}

if (options.abtVariant) {
    queryParamOptions.abtVariant = options.abtVariant;
}

if (options.fbclid) {
    queryParamOptions.fbclid = options.fbclid;
}

if (options.gclid) {
    queryParamOptions.gclid = options.gclid;
}
if (options.utm_campaign) {
    queryParamOptions.campaign = options.utm_campaign;
}
