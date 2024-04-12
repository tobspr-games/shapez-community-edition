/**
 * @type {Record<string, {
 *  standalone: boolean,
 *  environment?: 'dev' | 'staging' | 'prod',
 *  electronBaseDir?: string,
 *  executableName?: string
 * }>}
 */
export const BUILD_VARIANTS = {
    "web-localhost": {
        standalone: false,
        environment: "dev",
    },
    "web-shapezio-beta": {
        standalone: false,
        environment: "staging",
    },
    "web-shapezio": {
        standalone: false,
        environment: "prod",
    },
    "standalone-steam": {
        standalone: true,
        executableName: "shapez",
    },
};
