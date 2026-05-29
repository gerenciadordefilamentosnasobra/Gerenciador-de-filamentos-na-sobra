
let roloSelecionado = localStorage.getItem(
    'roloSelecionado'
);

if (roloSelecionado !== null) {

    roloSelecionado = parseInt(
        roloSelecionado
    );

}

const chokidar = require('chokidar');
const fs = require('fs');
const AdmZip = require('adm-zip');

const CAPACIDADE_ROLO = 1000;

/* VOZ */

function falarAviso(texto) {

    const voz = new SpeechSynthesisUtterance(
        texto
    );

    voz.lang = 'pt-BR';

    voz.rate = 1;

    voz.pitch = 1;

    speechSynthesis.speak(voz);

}

/* ELEMENTOS */

const botao = document.querySelector(
    '.save-btn'
);

const listaRolos = document.querySelector(
    '.lista-rolos'
);

const btnHistorico = document.getElementById(
    'btnHistorico'
);

const historicoPanel = document.querySelector(
    '.historico-panel'
);

const historicoLista = document.getElementById(
    'historicoLista'
);

let ultimoArquivoProcessado = '';

/* CRIAR ROLO */

botao.addEventListener('click', () => {

    const nome = document.getElementById(
        'filamentoNome'
    ).value;

    const corInput = document.getElementById(
        'filamentoCor'
    );

    const cor = corInput
        ? corInput.value
        : '#00ff88';

    const pesoTotal = Number(
        document.getElementById(
            'pesoTotal'
        ).value
    );

    const pesoCarretel = Number(
        document.getElementById(
            'pesoCarretel'
        ).value
    );

    const restante =
        pesoTotal - pesoCarretel;

    if (
        !nome ||
        pesoTotal <= 0 ||
        pesoCarretel < 0 ||
        restante < 0
    ) {

        alert(
            'Preencha os dados corretamente!'
        );

        return;

    }

    const resultado = document.querySelector(
        '.resultado'
    );

    resultado.innerText =
        `Restante calculado: ${restante}g`;

    const rolo = {
        nome,
        cor,
        restante
    };

    salvarRolo(rolo);

    atualizarInterfaceRolos();

});

/* SALVAR */

function salvarRolo(rolo) {

    let rolos = JSON.parse(
        localStorage.getItem('rolos')
    ) || [];

    rolos.push(rolo);

    localStorage.setItem(
        'rolos',
        JSON.stringify(rolos)
    );

}

/* MOSTRAR ROLO */

function mostrarRolo(rolo, index) {

    const item = document.createElement(
        'div'
    );

    const cor = rolo.cor || '#00ff88';

    item.classList.add('rolo-item');

    item.style.borderColor = cor;

    if (index === roloSelecionado) {

        item.style.boxShadow = `
        0 0 20px ${cor},
        0 0 40px ${cor},
        0 0 70px ${cor},
        inset 0 0 25px ${cor}
    `;

        item.style.transform =
            'scale(1.08)';

    } else {

        item.style.boxShadow = `
        0 0 10px ${cor},
        0 0 25px ${cor},
        inset 0 0 15px ${cor}66
    `;

    }

    item.onclick = () => {

        selecionarRolo(index);

    };

    if (index === roloSelecionado) {

        item.classList.add('ativo');

    }

    item.innerHTML = `

        <button class="delete-btn">
            X
        </button>

        <strong>
            ${rolo.nome}
        </strong>

        <span>
            ${parseFloat(
        rolo.restante
    ).toFixed(2)}g
        </span>

    `;

    const deleteBtn = item.querySelector(
        '.delete-btn'
    );

    deleteBtn.addEventListener(
        'click',
        (e) => {

            e.stopPropagation();

            excluirRolo(index);

        }
    );

    listaRolos.appendChild(item);

}

/* INTERFACE */

function atualizarInterfaceRolos() {

    listaRolos.innerHTML = '';

    carregarRolos();

}

/* CARREGAR */

function carregarRolos() {

    let rolos = JSON.parse(
        localStorage.getItem('rolos')
    ) || [];

    rolos.forEach((rolo, index) => {

        mostrarRolo(rolo, index);

    });

}

carregarRolos();

/* HISTÓRICO */

historicoPanel.style.display =
    'none';

btnHistorico.addEventListener(
    'click',
    () => {

        if (
            historicoPanel.style.display ===
            'none'
        ) {

            historicoPanel.style.display =
                'block';

            atualizarHistorico();

        } else {

            historicoPanel.style.display =
                'none';

        }

    }
);

/* WATCHER */

const watcher = chokidar.watch(
    'C:/teste-bambu',
    {
        persistent: true,
        ignoreInitial: true
    }
);

watcher.on('add', path => {

    if (!path.endsWith('.3mf')) {
        return;
    }

    if (
        path === ultimoArquivoProcessado
    ) {
        return;
    }

    ultimoArquivoProcessado = path;

    setTimeout(() => {

        try {

            const zip = new AdmZip(path);

            const entradas =
                zip.getEntries();

            const arquivoGcode =
                entradas.find(
                    entry =>
                        entry.entryName.endsWith(
                            '.gcode'
                        )
                );

            if (!arquivoGcode) {
                return;
            }

            const gcode = zip.readAsText(
                arquivoGcode.entryName
            );

            const pesoMatch = gcode.match(
                /total filament weight \[g\] : ([\d.]+)/
            );

            if (!pesoMatch) {
                return;
            }

            const peso = parseFloat(
                pesoMatch[1]
            );

            let rolos = JSON.parse(
                localStorage.getItem('rolos')
            ) || [];

            if (
                roloSelecionado !== null &&
                rolos[roloSelecionado]
            ) {

                const restanteAtual =
                    parseFloat(
                        rolos[
                            roloSelecionado
                        ].restante
                    );

                if (peso > restanteAtual) {

                    falarAviso(
                        'Filamento insuficiente'
                    );

                    alert(
                        'Filamento insuficiente!'
                    );

                    return;

                }

                const novoRestante =
                    restanteAtual - peso;

                rolos[
                    roloSelecionado
                ].restante =
                    novoRestante;

                if (novoRestante <= 0) {

                    falarAviso(
                        'Acabou o filamento'
                    );

                    alert(
                        'Acabou o filamento!'
                    );

                }

                const porcentagem =
                    (novoRestante /
                        CAPACIDADE_ROLO) * 100;

                if (
                    porcentagem <= 10 &&
                    novoRestante > 0
                ) {

                    falarAviso(
                        'Atenção! Abaixo de Dez por cento de filamento!'
                    );

                    alert(
                        'Aviso! Capacidade abaixo de 10%'
                    );

                } else if (
                    porcentagem <= 20 &&
                    novoRestante > 0
                ) {

                    falarAviso(
                        'Atenção! Abaixo de Vinte por cento de filamento!'
                    );

                    alert(
                        'Aviso! Capacidade abaixo de 20%'
                    );

                }

                localStorage.setItem(
                    'rolos',
                    JSON.stringify(rolos)
                );

                atualizarInterfaceRolos();

            }

            atualizarHistorico();

            document.getElementById(
                'pesoProjeto'
            ).innerText =
                `Peso estimado: ${peso.toFixed(2)}g`;

            document.getElementById(
                'arquivoAtual'
            ).innerText =
                path.split('\\').pop();

        } catch (erro) {

            console.error(
                'Erro ao processar arquivo:',
                erro
            );

        }

    }, 1000);

});

watcher.on('unlink', () => {

    atualizarHistorico();

});

/* SELECIONAR */

function selecionarRolo(index) {

    roloSelecionado = index;

    localStorage.setItem(
        'roloSelecionado',
        index
    );

    atualizarInterfaceRolos();

}

/* EXCLUIR */

function excluirRolo(index) {

    let rolos = JSON.parse(
        localStorage.getItem('rolos')
    ) || [];

    rolos.splice(index, 1);

    localStorage.setItem(
        'rolos',
        JSON.stringify(rolos)
    );

    if (roloSelecionado == index) {

        localStorage.removeItem(
            'roloSelecionado'
        );

        roloSelecionado = null;

    }

    atualizarInterfaceRolos();

}

/* HISTÓRICO */

function atualizarHistorico() {

    historicoLista.innerHTML = '';

    fs.readdir(
        'C:/teste-bambu',
        (err, arquivos) => {

            if (err) {
                return;
            }

            arquivos.forEach(arquivo => {

                if (
                    arquivo.endsWith('.3mf')
                ) {

                    const item =
                        document.createElement(
                            'div'
                        );

                    item.classList.add(
                        'historico-item'
                    );

                    item.innerText =
                        arquivo;

                    historicoLista.appendChild(
                        item
                    );

                }

            });

        }
    );

}