import { invoke } from "@tauri-apps/api/core"

/* ============ TODO ============ */
/* Нормальная работа с протоколом */


/* ******************** */
/* Начало тупых функций */
/* ******************** */
function hexToBytes(hex) {
    if (hex.length % 2 !== 0) throw new Error("Нечётная длина hex-строки")
    const arr = new Uint8Array(hex.length / 2)
    for (let i = 0; i < arr.length; i++) {
        arr[i] = parseInt(hex.substr(i * 2, 2), 16)
    }
    return arr
}

function bytesToHex(bytes) {
    return Array.from(bytes)
        .map(b => b.toString(16).padStart(2, "0"))
        .join("")
}

function stringToHex(str) {
  return Array.from(new TextEncoder().encode(str))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("")
}

function bytesToStr(bytes) {
    if (!(bytes instanceof Uint8Array)) {
        bytes = new Uint8Array(bytes) // конвертируем обычный массив в Uint8Array
    }
    const decoder = new TextDecoder("utf-8", { fatal: false })
    console.log(bytes)
    let text = decoder.decode(bytes)
    return text.replace(/\uFFFD/g, "_")
}

const hexToStr = h => {
    return bytesToStr(hexToBytes(h))
}

function hexToArrayBuffer(hex) {
  if (hex.length % 2 !== 0) {
    throw new Error("Нечётная длина hex строки");
  }

  const buffer = new ArrayBuffer(hex.length / 2);
  const view = new Uint8Array(buffer);

  for (let i = 0; i < hex.length; i += 2) {
    view[i / 2] = parseInt(hex.substr(i, 2), 16);
  }

  return buffer;
}
/* ************************ */
/* Завершение тупых функций */
/* ************************ */

/* Пакет инициализации */
// TODO морф useragent'а
const getConnectionPacket = () => {
    return CONNECTION
}

/* Ввод номера телефона */
const getAuthStartPacket = phone => {
    const phoneHex = stringToHex(phone)
    console.log('phone', phone, phoneHex)
    const hexPacket = START_AUTH.replace('PHONE', phoneHex)
    return hexPacket
}

/* Передача кода */
const getAuthPacket = (tokenHex, code) => {
    const codeHex = stringToHex(code)
    //const tokenHex = stringToHex(token)
    const hexPacket = AUTH.replace('CODE', codeHex).replace('TOKEN', tokenHex)
    return hexPacket
}

/* Завершение регистрации именем */
// TODO выбор аватара
const getAuthConfirmPacket = (regTokenHex, name) => {
    //const regTokenHex = stringToHex(token)
    const nameHex = stringToHex(name)
    const hexPacket = AUTH_CONFIRM.replace('NAME', nameHex).replace('REGTOKEN', regTokenHex)
    return hexPacket
}

async function connect() {
    const connect = getConnectionPacket();
    const conResponse = await invoke("send_and_get", { dataHex: connect })
    console.log('! Connection response', conResponse)
}

export async function startAuth(phoneNumber) {
    console.log('~ Connecting...')
    await invoke("connect")
    console.log('! Connected')
    
    await connect();
    
    await new Promise(r => setTimeout(r, 1500 + 1000 * Math.random()));
    const phone = getAuthStartPacket(phoneNumber)
    const phoneResponse = await invoke("send_and_get", { dataHex: phone })
    console.log('! Phone response', phoneResponse)
    
    const tokenStart = "746f6b656ed988"
    const tokenEndIndex = hexToStr(phoneResponse).indexOf('codeLength') * 2 + 4
    const authToken = phoneResponse.slice(phoneResponse.indexOf(tokenStart) + tokenStart.length, tokenEndIndex)
    
    return { token: authToken };
}

export async function register(token, verifyCode, name) {
    console.log('a')
    let success = false;
    let regToken = null;
    
    for(let i = 0; i < 2; i++) {
        const auth = getAuthPacket(token, verifyCode)
        console.log('auth packet to send', auth)
        const authResponse = await invoke("send_and_get", { dataHex: auth })
        if (authResponse === "Not connected") {
            await connect();
            continue;
        }
        
        regToken = authResponse.slice(authResponse.indexOf('D9BF') + 4, authResponse.indexOf('AD70726573657441766174'))
        console.log(authResponse, "\n", regToken)
        success = true;
        break;
    }
    
    if (!success) return { success, error: "Не отправился пакет подтверждения :(" }
    
    console.log(regToken)
    
    await new Promise(r => setTimeout(r, 1500 + Math.random() * 500));
    const confirm = getAuthConfirmPacket(regToken, name)
    const confirmResponse = await invoke("send_and_get", { dataHex: confirm })
    
    const content = hexToStr(confirmResponse)
    console.log(confirmResponse, '\n', content)
    
    if (content.includes("error.code.attempt.limit_message"))
        return { error: "Этот код устарел, получите новый" };
    
    return { success }
}

// нафинк
export const CONNECTION = `0A00000100060200011DF36B84AF636C69656E7453657373696F6E496410AD6D745F696E7374616E63656964D92431336231646562392D343464622D343638382D626466332D306462366366616137353033A9757365724167656E748AAA64657669636554797065A7414E44524F4944AA61707056657273696F6EA732352E31302E30A96F731200F318AA416E64726F6964203133A874696D657A6F6E65A3474D54A673637265656EB5313330647069200700D536303078383734AE70757368446900F30EA347434DA66C6F63616C65A27275AB6275696C644E756D626572CD19019100F3064E616D65BE756E6B6E6F776E2047656E65726963207C00822D7838365F3634AC2A00124C490032656EA81000F0044964B034316336646331383838396632353439`

// PHONE
export const START_AUTH = `0a000003001101000026f01582a570686f6e65acPHONEa474797065aa53544152545f41555448`

// CODE, TOKEN
export const AUTH = `0A0000380012010000BEF01F83AA766572696679436F6465A6CODEAD61757468546F6B656E54797065AA434845434B5F434F4445A5741500F07BD988TOKEN`

// NAME, REGTOKEN
export const AUTH_CONFIRM = `0A000039001702000110F02D85A966697273744E616D65A4NAMEA770686F746F4964CE002D7DF9AA61766174617254797065AD5052455345545F415641544152A9746F6B656E1800A1A85245474953544552A51300F0B2D9BFREGTOKEN`

