const ldap = require('ldapjs');

const LDAP_URL = process.env.LDAP_URL || 'ldap://172.16.90.249:389';
const LDAP_BASE_DN = process.env.LDAP_BASE_DN; // ask IT admin, e.g. 'OU=Users,DC=htlbulme,DC=at'
const LDAP_BIND_DN = process.env.LDAP_BIND_DN;
const LDAP_BIND_PASSWORD = process.env.LDAP_BIND_PASSWORD;

// --- Authenticate a user against the school's LDAP server ---
function authenticateLDAP(username, password) {
  return new Promise((resolve, reject) => {
    const client = ldap.createClient({ url: LDAP_URL });
    client.on('error', (err) => reject(err));

    // Step 1: bind as service account to search for the user
    client.bind(LDAP_BIND_DN, LDAP_BIND_PASSWORD, (err) => {
      if (err) return reject(new Error('LDAP service bind failed'));

      const searchOptions = {
        filter: `(sAMAccountName=${username})`, // OpenLDAP: use (uid=${username})
        scope: 'sub',
        attributes: ['dn', 'mail', 'givenName', 'sn'],
      };

      client.search(LDAP_BASE_DN, searchOptions, (err, res) => {
        if (err) return reject(err);
        let entry = null;

        res.on('searchEntry', (e) => { entry = e.object; });
        res.on('error', (err) => reject(err));
        res.on('end', () => {
          if (!entry) {
            client.unbind();
            return reject(new Error('User not found in LDAP'));
          }

          // Step 2: re-bind as the actual user to verify password
          client.bind(entry.dn, password, (err) => {
            client.unbind();
            if (err) return reject(new Error('Invalid LDAP credentials'));
            resolve(entry);
          });
        });
      });
    });
  });
}

module.exports = { authenticateLDAP };