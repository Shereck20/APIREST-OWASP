
const express = require('express');
const app = express();

app.use(express.json());

// Banco de dados em memória
let tarefas = [
    { id: 1, titulo: 'Aprender Express', concluida: false, prioridade: 'alta' },
    { id: 2, titulo: 'Criar minha primeira API', concluida: false, prioridade: 'media' }
];

let proximoId = 3;

// LISTAR tarefas com filtro opcional por status
app.get('/tarefas', (req, res) => {
    const { concluida } = req.query;
    let resultado = tarefas;

    if (concluida !== undefined) {
        resultado = tarefas.filter(
            t => t.concluida === (concluida === 'true')
        );
    }

    res.json(resultado);
});

// RESUMO das tarefas
app.get('/tarefas/resumo', (req, res) => {
    const concluidas = tarefas.filter(t => t.concluida).length;
    const pendentes = tarefas.filter(t => !t.concluida).length;

    res.json({
        total: tarefas.length,
        concluidas,
        pendentes
    });
});

// BUSCAR uma tarefa específica
app.get('/tarefas/:id', (req, res) => {
    const tarefa = tarefas.find(t => t.id === Number(req.params.id));

    if (!tarefa) {
        return res.status(404).json({ erro: 'Tarefa nao encontrada' });
    }

    res.json(tarefa);
});

// CRIAR uma nova tarefa
app.post('/tarefas', (req, res) => {
    const { titulo, prioridade = 'media' } = req.body;

    if (typeof titulo !== 'string' || !titulo.trim()) {
        return res.status(400).json({
            erro: 'O titulo e obrigatorio e nao pode estar vazio'
        });
    }

    const tituloExiste = tarefas.some(
        t => t.titulo.toLowerCase() === titulo.trim().toLowerCase()
    );

    if (tituloExiste) {
        return res.status(400).json({
            erro: 'Ja existe uma tarefa com esse titulo'
        });
    }

    const prioridadesValidas = ['baixa', 'media', 'alta'];

    if (!prioridadesValidas.includes(prioridade)) {
        return res.status(400).json({
            erro: 'Prioridade deve ser baixa, media ou alta'
        });
    }

    const novaTarefa = {
        id: proximoId++,
        titulo: titulo.trim(),
        concluida: false,
        prioridade
    };

    tarefas.push(novaTarefa);

    res.status(201).json(novaTarefa);
});

// ATUALIZAR uma tarefa
app.put('/tarefas/:id', (req, res) => {
    const tarefa = tarefas.find(t => t.id === Number(req.params.id));

    if (!tarefa) {
        return res.status(404).json({ erro: 'Tarefa nao encontrada' });
    }

    const { titulo, concluida, prioridade } = req.body;

    if (titulo !== undefined) {
        if (typeof titulo !== 'string' || !titulo.trim()) {
            return res.status(400).json({
                erro: 'O titulo nao pode estar vazio'
            });
        }

        const tituloExiste = tarefas.some(
            t => t.id !== tarefa.id &&
                t.titulo.toLowerCase() === titulo.trim().toLowerCase()
        );

        if (tituloExiste) {
            return res.status(400).json({
                erro: 'Ja existe uma tarefa com esse titulo'
            });
        }

        tarefa.titulo = titulo.trim();
    }

    if (concluida !== undefined) {
        if (typeof concluida !== 'boolean') {
            return res.status(400).json({
                erro: 'Concluida deve ser true ou false'
            });
        }

        tarefa.concluida = concluida;
    }

    if (prioridade !== undefined) {
        const prioridadesValidas = ['baixa', 'media', 'alta'];

        if (!prioridadesValidas.includes(prioridade)) {
            return res.status(400).json({
                erro: 'Prioridade deve ser baixa, media ou alta'
            });
        }

        tarefa.prioridade = prioridade;
    }

    res.json(tarefa);
});

// DELETAR todas as tarefas concluídas
app.delete('/tarefas', (req, res) => {
    const quantidadeAntes = tarefas.length;

    tarefas = tarefas.filter(t => !t.concluida);

    res.json({
        mensagem: 'Tarefas concluidas removidas',
        removidas: quantidadeAntes - tarefas.length
    });
});

// DELETAR uma tarefa específica
app.delete('/tarefas/:id', (req, res) => {
    const index = tarefas.findIndex(
        t => t.id === Number(req.params.id)
    );

    if (index === -1) {
        return res.status(404).json({ erro: 'Tarefa nao encontrada' });
    }

    tarefas.splice(index, 1);

    res.status(204).send();
});


app.listen(3000, () => {console.log('API de tarefas rodando na porta 3000');});