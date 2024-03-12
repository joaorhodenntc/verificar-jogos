const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');

const token = '7015916592:AAGHztuvJipu86Ht0-6GvCQzvuAC_qeIN-k'
const chat_bot = '-1002076162652'

const bot = new TelegramBot(token, { polling: true });

async function obterPartidas(data) {
    const url = `https://apiv3.apifootball.com/?action=get_odds&APIkey=ce1a9e39eaa2a1d13ae756306d88205321727bf0a07687a249b5c9f786eca0ff&from=${data}&to=${data}`;
    const response = await axios.get(url);
    return response.data;
}

async function obterNomes(idPartida) {
    const url =`https://apiv3.apifootball.com/?action=get_events&APIkey=ce1a9e39eaa2a1d13ae756306d88205321727bf0a07687a249b5c9f786eca0ff&timezone=-03:00&match_id=${idPartida}`;
    const response = await axios.get(url);
    return response.data;
}

bot.onText(/\/partidas (.+)/, async (msg, match) => {
    const data = match[1]; // Extrai a data do comando /partidas

    try {
        const partidas = await analisarPartidas(data); 
        const mensagem = `*👑 Partidas SF: ${partidas.length}*\n\n🗓 ${data}\n\n` + partidas.map(partida => `${partida.horarioPartida} > ${partida.nomeHome} x ${partida.nomeAway}`).join("\n");
        bot.sendMessage(chat_bot, mensagem, { parse_mode: "Markdown" });
    } catch (error) {
        console.error("Erro ao obter partidas:", error);
        bot.sendMessage(chat_bot, "Ocorreu um erro ao obter as partidas. Por favor, tente novamente mais tarde.");
    }
});

async function analisarPartidas(data) {
    const dados = await obterPartidas(data); 
    const partidasSF = []; 

    for (let i = 0; i < dados.length; i++) {
        if (dados[i].odd_bookmakers == "bet365") {
            let oddHome = dados[i].odd_1;
            let oddAway = dados[i].odd_2;
            if (oddHome <= 1.4 || oddAway <= 1.4) {
                const idPartida = dados[i].match_id;
                const pegarNomes = await obterNomes(idPartida);
                if(pegarNomes[0].match_date == data){
                    const nomeHome = pegarNomes[0].match_hometeam_name;
                    const nomeAway = pegarNomes[0].match_awayteam_name;
                    const horarioPartida = pegarNomes[0].match_time;
                    partidasSF.push({nomeHome, nomeAway, horarioPartida }); 
                }
            }
        }
    }

    // Ordena as partidas pelo horário (considerando que o horário está em formato "HH:MM")
    partidasSF.sort((partidaA, partidaB) => {
        if (partidaA.horarioPartida < partidaB.horarioPartida) return -1;
        if (partidaA.horarioPartida > partidaB.horarioPartida) return 1;
        return 0;
    });

    const mensagem = `*👑 Partidas SF: ${partidasSF.length}*\n\n🗓 ${data}\n\n` + partidasSF.map(partida => `${partida.horarioPartida} > ${partida.nomeHome} x ${partida.nomeAway}`).join("\n");
    bot.sendMessage(chat_bot, mensagem, { parse_mode: "Markdown" });    
    console.log(mensagem);

    return partidasSF; 
}

function verificarHorario() {
    const agora = new Date();
    let horaAtualBrasilia = agora.getUTCHours() - 3;
    let minutoAtualBrasilia = agora.getUTCMinutes();
    if (horaAtualBrasilia < 0) {
         horaAtualBrasilia = 24 + horaAtualBrasilia;
    }
    console.log("Horário servidor: " + horaAtualBrasilia + ":" + minutoAtualBrasilia)
    if(horaAtualBrasilia === 0 && minutoAtualBrasilia === 11){
        try{
            analisarPartidas();
        } catch(error){
            console.error(error);
        }
    }
}

// Verifica o horário a cada minuto
setInterval(verificarHorario, 30000);

