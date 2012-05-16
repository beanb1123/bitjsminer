/* A JavaScript implementation of SHA-256 (c) 2009 Lapo Luchini <lapo@lapo.it>
 *
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
 * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
 * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 *
 * Credits:
 * largely inspired to Angel Marin's http://anmar.eu.org/projects/jssha2/
 * with ideas from Christoph Bichlmeier's http://www.bichlmeier.info/sha256.html
 * (both distributed under the BSD License)
 */

var SHA2 = {};

SHA2.chrsz   = 8;  /* bits per input character. 8 - ASCII; 16 - Unicode      */
SHA2.hex_tab = "0123456789ABCDEF";

SHA2.S = function(X, n) { return (X >>> n) | (X << (32 - n)); };
SHA2.R = function(X, n) { return X >>> n; };
SHA2.Ch = function(x, y, z) { return (x & y) ^ ((~x) & z); };
SHA2.Maj = function(x, y, z) { return (x & y) ^ (x & z) ^ (y & z); };
SHA2.Sigma0 = function(x) { return this.S(x, 2) ^ this.S(x, 13) ^ this.S(x, 22); };
SHA2.Sigma1 = function(x) { return this.S(x, 6) ^ this.S(x, 11) ^ this.S(x, 25); };
SHA2.Gamma0 = function(x) { return this.S(x, 7) ^ this.S(x, 18) ^ this.R(x, 3); };
SHA2.Gamma1 = function(x) { return this.S(x, 17) ^ this.S(x, 19) ^ this.R(x, 10); };
SHA2.K = [0x428A2F98, 0x71374491, 0xB5C0FBCF, 0xE9B5DBA5, 0x3956C25B, 0x59F111F1, 0x923F82A4, 0xAB1C5ED5, 0xD807AA98, 0x12835B01, 0x243185BE, 0x550C7DC3, 0x72BE5D74, 0x80DEB1FE, 0x9BDC06A7, 0xC19BF174, 0xE49B69C1, 0xEFBE4786, 0xFC19DC6, 0x240CA1CC, 0x2DE92C6F, 0x4A7484AA, 0x5CB0A9DC, 0x76F988DA, 0x983E5152, 0xA831C66D, 0xB00327C8, 0xBF597FC7, 0xC6E00BF3, 0xD5A79147, 0x6CA6351, 0x14292967, 0x27B70A85, 0x2E1B2138, 0x4D2C6DFC, 0x53380D13, 0x650A7354, 0x766A0ABB, 0x81C2C92E, 0x92722C85, 0xA2BFE8A1, 0xA81A664B, 0xC24B8B70, 0xC76C51A3, 0xD192E819, 0xD6990624, 0xF40E3585, 0x106AA070, 0x19A4C116, 0x1E376C08, 0x2748774C, 0x34B0BCB5, 0x391C0CB3, 0x4ED8AA4A, 0x5B9CCA4F, 0x682E6FF3, 0x748F82EE, 0x78A5636F, 0x84C87814, 0x8CC70208, 0x90BEFFFA, 0xA4506CEB, 0xBEF9A3F7, 0xC67178F2];

SHA2.core = function(m, l) {
    var HASH = [0x6A09E667, 0xBB67AE85, 0x3C6EF372, 0xA54FF53A, 0x510E527F, 0x9B05688C, 0x1F83D9AB, 0x5BE0CD19];
    var W = new Array(64);
    var a, b, c, d, e, f, g, h, i, j, jt;
    var T1, T2;

    /* append padding */
    var padA = l >> 5;
    var padB = ((l + 64 >> 9) << 4) + 15;
    m[padA] |= 0x80 << (24 - l % 32);
    for (i = padA + 1; i < padB; ++i)
    	m[i] = 0;
    m[padB] = l;

    for (i = 0; i < m.length; i += 16) {
        a = HASH[0];
        b = HASH[1];
        c = HASH[2];
        d = HASH[3];
        e = HASH[4];
        f = HASH[5];
        g = HASH[6];
        h = HASH[7];

        for (j = 0; j < 64; j++) {
        	jt = j & 0xF;
            if (j < 16)
            	W[j] = m[j + i];
            else {
            	W[jt] = (W[jt] + this.Gamma1(W[(j+14)&0xF]))|0;
            	W[jt] = (W[jt] + W[(j+9)&0xF])|0;
            	W[jt] = (W[jt] + this.Gamma0(W[(j+1)&0xF]))|0;
            }

            T1 = (h + this.Sigma1(e))|0;
            T1 = (T1 + this.Ch(e, f, g))|0;
            T1 = (T1 + this.K[j])|0;
            T1 = (T1 + W[jt])|0;
            T2 = (this.Sigma0(a) + this.Maj(a, b, c))|0;

            h = g;
            g = f;
            f = e;
            e = (d + T1)|0;
            d = c;
            c = b;
            b = a;
            a = (T1 + T2)|0;
        }
        
        HASH[0] = (a + HASH[0])|0;
        HASH[1] = (b + HASH[1])|0;
        HASH[2] = (c + HASH[2])|0;
        HASH[3] = (d + HASH[3])|0;
        HASH[4] = (e + HASH[4])|0;
        HASH[5] = (f + HASH[5])|0;
        HASH[6] = (g + HASH[6])|0;
        HASH[7] = (h + HASH[7])|0;
    }
    return HASH;
};

SHA2.str2binb = function(str) {
	var bin = [];
	var mask = (1 << chrsz) - 1;
	for (var i = 0; i < str.length * chrsz; i += chrsz)
		bin[i>>5] |= (str.charCodeAt(i / chrsz) & mask) << (24 - i%32);
	return bin;
};

SHA2.binb2hex = function(binarray) {
	var str = "";
	for(var i = 0; i < binarray.length * 4; i++) {
		str += this.hex_tab.charAt((binarray[i>>2] >> ((3 - i%4)*8+4)) & 0xF) +
		this.hex_tab.charAt((binarray[i>>2] >> ((3 - i%4)*8  )) & 0xF);
	}
	return str;
};

SHA2.hex = function(s) { return this.binb2hex(this.core(this.str2binb(s), s.length * this.chrsz)); };
