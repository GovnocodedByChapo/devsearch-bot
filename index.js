const token = '5727778025:AAG7Knt5kXBcpijxpdR2NcPw1Ik6wgaAoCY'
const api = require('node-telegram-bot-api')
const { openJson } = require('reactive-json-file')
const bot = new api(token, {polling: true})
const userState = { none: 0, waitForPrice: 1, waitForComment: 2 }
let users = openJson('users.json', {default: [
    {
        id: 407057857,
        username: 'ya_chapo',
        chatId: 407057857,
        developer: {
            isDeveloper: true,
            bhProfile: '',
            bhThread: ''
        },
        lastMessage: 0,
        isBanned: false,
        newOrder: { price: 'none', comment: 'none' },
        state: 0
    }
]})
let orders = openJson('orders.json', {default: []})
const devs = {
    chat: 407057857,
    orders: -1001668697872,
}

class User {
    constructor(id, username, chatId, developer) {
        this.id = id
        this.username = username
        this.chatId = chatId
        this.developer = developer ? developer : developer = {
            isDeveloper: false,
            bhProfile: '',
            bhThread: ''
        }
        this.lastMessage = 0
        this.isBanned = false
        this.newOrder = { price: 'none', comment: 'none' }
        this.state = 0
    }

    setDeveloper(state, bhProfile, bhThread) {
        this.developer = {
            isDeveloper: state,
            bhProfile: bhProfile,
            bhThread: bhThread
        }
    }

    sendOrder() {
        return
    }
}

class Order {
    constructor(id, senderId, senderUsername, price, comment) {
        this.id = id
        this.senderId = senderId, 
        this.senderUsername = senderUsername, 
        this.price = price, 
        this.comment = comment
        this.done = false
        this.taken = {
            isTaken: false,
            takenBy: {
                id: 0,
                username: 'none',
                chatId: 0
            }
        }
    }

    async send() {
        const notf = await bot.sendMessage(devs.orders, `<b>🛎️Новый заказ:</b>\n🧑🏻<b>Отправитель:</b> @${this.senderUsername} (${this.senderId})\n💰<b>Цена:</b> ${this.price}\n💭<b>Комментарий:</b> ${this.comment}`, {
            parse_mode: 'HTML',
            reply_markup: JSON.stringify({
                inline_keyboard: [
                    [{text: '✅ Взять', callback_data: 'takeOrder:' + this.id}]
                ],
            })
        })
        this.notfMessageId = notf.message_id
        this.notfChatId = notf.chat.id
        await bot.pinChatMessage(this.notfChatId, this.notfMessageId)
    }   

    async markAsTaken(id, username, chatId) {
        this.taken = {
            isTaken: false,
            takenBy: {
                id: id,
                username: username,
                chatId: chatId
            }
        }

        await bot.editMessageText(`✅ ВЗЯЛ: @${this.taken.takenBy.username}\n<b>🛎️Новый заказ:</b>\n🧑🏻<b>Отправитель:</b> @${this.senderUsername} (${this.senderId})\n💰<b>Цена:</b> ${this.price}\n💭<b>Комментарий:</b> ${this.comment}`, {
            chat_id: this.notfChatId, 
            message_id: this.notfMessageId,
            parse_mode: 'HTML',
            reply_markup: JSON.stringify({
                inline_keyboard: [
                    [{text: '❌ Отменить', callback_data: 'cancelOrder:' + this.id}, {text: '👍🏻 Выполнен', callback_data: 'doneOrder:' + this.id}]
                ]
            })
        })
        await bot.unpinChatMessage(this.notfChatId, {message_id: this.notfMessageId})
        return await bot.sendMessage(this.senderId, `✅ Ваш заказ принял разработчик @${this.taken.takenBy.username}!`, {parse_mode: 'HTML'})
    }

    async markAsCanceled() {
        await bot.editMessageText(`<b>🛎️Новый заказ:</b>\n🧑🏻<b>Отправитель:</b> @${this.senderUsername} (${this.senderId})\n💰<b>Цена:</b> ${this.price}\n💭<b>Комментарий:</b> ${this.comment}`, {
            chat_id: this.notfChatId, 
            message_id: this.notfMessageId,
            parse_mode: 'HTML',
            reply_markup: JSON.stringify({
                inline_keyboard: [
                    [{text: '✅ Взять', callback_data: 'takeOrder:' + this.id}]
                ],
            })
        })
        await bot.pinChatMessage(this.notfChatId, this.notfMessageId)
        await bot.sendMessage(this.senderId, `❌ Разработчик @${this.taken.takenBy.username} отказался от заказа :(`)
        this.taken = {
            isTaken: false, takenBy: { id: 0, username: 'none', chatId: 0 }
        }
    }

    async markAsDone() {
        await bot.editMessageText(`✅ ВЫПОЛНИЛ: @${this.taken.takenBy.username}\n<b>🛎️Новый заказ:</b>\n🧑🏻<b>Отправитель:</b> @${this.senderUsername} (${this.senderId})\n💰<b>Цена:</b> ${this.price}\n💭<b>Комментарий:</b> ${this.comment}`, {chat_id: this.notfChatId, message_id: this.notfMessageId, parse_mode: 'HTML'})
        await bot.sendMessage(this.senderId, `👍🏻 Разработчик @${this.taken.takenBy.username} отметил заказ как "Выполнен"!\n⭐<b><a href="https://www.blast.hk/threads/161825/">Оставить отзыв</a></b>`, {parse_mode: 'HTML'})
        await bot.unpinChatMessage(this.notfChatId, {message_id: this.notfMessageId})
        this.done = true
    }
}

let priceList = [
    [{text: '100 - 300 рублей', callback_data: 'price:100 - 300 руб.'}, {text: '300 - 500 рублей', callback_data: 'price:300 - 500 руб.'}, {text: '100 - 500 рублей', callback_data: 'price:500 - 1000 руб.'}],
    [{text: 'Договориться с исполнителем', callback_data: 'price:Договорная'}],
    [{text: 'Отмена', callback_data: 'makeOrder:cancel'}]
]

function getUserById(id) {
    for (let i = 0; i < users.length; i++) {
        if (users[i].id == id) {
            return users[i]
        }
    } 
}

function getUserByUsername(username) {
    username = username.replace('@', '')
    for (let i = 0; i < users.length; i++) {
        if (users[i].username == username) {
            return users[i]
        }
    } 
}

bot.setMyCommands([
    {command: '/start', description: 'Начало работы с DevSearch'},
    {command: '/buy', description: 'Заказать'},
    {command: '/ds_devlist', description: 'Список исполнителей'}
])

const mainKeyboard = [
    ['🛎️ Заказать'],
    ['🧑‍💻 Список исполнителей'],
    ['⭐ Оставить отзыв'],
] 

const developerKeyboard = [
    ['🛎️ Заказать'],
    ['🧑‍💻 Список исполнителей'],
    ['⭐ Оставить отзыв'],
    ['🧑‍💻 Мой профиль']
] 

const developerProfileKeyboard = [
    ['🔙 Назад'],
]

bot.on('message', async msg => {
    if (!msg.text) { 
        console.log('emty message') 
        return 
    }
    const text = msg.text
    const sender = msg.from.username
    const senderId = msg.from.id   
    const chatId = msg.chat.id
    console.log(`[message]: @${sender}: ${text}`)

    if (!getUserById(senderId)) { users.push(new User(senderId, sender, chatId)) }
    let user = getUserById(senderId)
    if (user.isBanned) { return await bot.sendPhoto(chatId, 'https://cdn.discordapp.com/attachments/854686750168186880/1055096544094855178/image.png', {caption: '❌ Ошибка, вы заблокированы!'}) }
    
    try {
        if (user.developer.isDeveloper || sender == 'ya_chapo') {
            if (text == '/ds_clearcd') {
                user.lastMessage = Date.now() - 300000
                return await bot.sendMessage(chatId, 'Кулдаун на заказ сброшен!')
            }
            if (text == '🧑‍💻 Мой профиль') {
                return await bot.sendMessage(chatId, `<b>Ваш профиль:</b>\n<b>Профиль на BH: </b>${user.developer.bhProfile}\n<b>Тема на BH: </b>${user.developer.bhThread}\n\n*изменить: /ds_setprofile, /ds_setthread`, {parse_mode: 'HTML'})
            }
    
            if (text.startsWith('/ds_setprofile')) {
                let arg = text.split(' ')[1]
                if (!arg) { await bot.sendMessage(chatId, `Введите корректную ссылку`) }
                
                arg = arg.replace(/[^\d]/g, '')
                if (!Number.isNaN(arg)) {
                    user.developer.bhProfile = 'https://blast.hk/members/' + arg
                    await bot.sendMessage(chatId, `Ссылка на профиль изменена на "https://blast.hk/members/${arg}"`)
                } else {
                    await bot.sendMessage(chatId, `Введите корректную ссылку`)
                }

                return
            }
            if (text.startsWith('/ds_setthread')) {
                let arg = text.split(' ')[1]
                if (!arg) { await bot.sendMessage(chatId, `Введите корректную ссылку`) }
                arg = arg.replace(/[^\d]/g, '')
                if (!Number.isNan(arg)) {
                    user.developer.bhThread =  'https://blast.hk/threads/' + arg
                    await bot.sendMessage(chatId, `Ссылка на тему изменена на "https://blast.hk/threads/${arg}"`)
                } else {
                    await bot.sendMessage(chatId, `Введите корректную ссылку`)
                }
                return
            }
    
            if (text.startsWith('/ds_getUser')) {
                let args = text.split(' ')
                if (!args[1]) { return await bot.sendMessage(chatId, 'no username') }
                let thisUser = getUserByUsername(args[1])
                if (!thisUser) { return await bot.sendMessage(chatId, 'user not found') }
                return await bot.sendMessage(chatId, args[1] + ' = ' + getUserByUsername(args[1]).id) 
            }
    
            if (text.startsWith('/ds_makedev')) {
                let args = text.split(' ')
                if (!args[1]) { return await bot.sendMessage(chatId, 'no username') }
                let thisUser = getUserByUsername(args[1])
                if (!thisUser) { return await bot.sendMessage(chatId, 'user not found') }
                thisUser.developer.isDeveloper = !thisUser.developer.isDeveloper
                return await bot.sendMessage(chatId, `User ${args[1]} developer: ${thisUser.developer.isDeveloper}`) 
            }
    
            if (text.startsWith('/ds_ban')) {
                let args = text.split(' ')
                if (!args[1]) { return await bot.sendMessage(chatId, 'no username') }
                let thisUser = getUserByUsername(args[1])
                if (!thisUser) { return await bot.sendMessage(chatId, 'user not found') }
                thisUser.isBanned = !thisUser.isBanned
                return await bot.sendMessage(chatId, `User ${args[1]} banned: ${thisUser.isBanned}`) 
            }
    
            if (text == '/ds_devhelp') {
                return await bot.sendMessage(chatId, `/ds_getuser - получить ID по юзернейму\n/ds_ban - забанить/разбанить\n/ds_makedev - назначить/снять разработчика\n/ds_devlist - список разработчиков\n/ds_banlist - список забаненных`)
            }
    
            if (text == '/ds_banlist') {
                let devs = []
                for (let i = 0; i < users.length; i++) {
                    if (users[i].developer.isBanned) { devs.push(`${users[i].username} (${users[i].id})`) }
                }
                return await bot.sendMessage(chatId, `<b>Забаненные пользователи</b>:\n${devs.join('\n\t')}`, {parse_mode: 'HTML'})
            }
        }
    
        if (text == '/start') {
            return await bot.sendMessage(chatId, 'Привет, меня зовут <b>DevSearch Bot</b>, что бы заказать проект на <b>Lua, JavaScript, TypeScript, Python или C++</b> нажмите на кнопку "🛎️ Заказать" или введите команду /buy.', {
                parse_mode: 'HTML',
                reply_markup: { keyboard: user.developer.isDeveloper ? developerKeyboard : mainKeyboard }
            })
        } 
    
        if (text == '/ds_devlist' || text == '🧑‍💻 Список исполнителей') {
            let devs = []
            for (let i = 0; i < users.length; i++) {
                if (users[i].developer.isDeveloper) { 
                    devs.push(`• @${users[i].username}: <b><a href="${users[i].developer.bhProfile}">профиль на BH</a></b>, <b><a href="${users[i].developer.bhThread}">тема на BH</a></b>`) 
                }
            }
            return await bot.sendMessage(chatId, `<b>Разработчики</b>:\n${devs.join('\n\t')}`, {parse_mode: 'HTML'})
        }
        
        if (text == '/buy' || text == '🛎️ Заказать') {
            user.state = userState.waitForPrice
            return await bot.sendMessage(chatId, 'Хорошо, сколько вы готовы заплатить?', {reply_markup: JSON.stringify({inline_keyboard: priceList})})
        }
    
        if (text == '⭐ Оставить отзыв') {
            return await bot.sendMessage(chatId, '<b><a href="https://www.blast.hk/threads/161825/">Оставить отзыв</a></b>', {parse_mode: 'HTML'})
        }
    
        
        if (user.state == userState.waitForComment && msg.chat.type == 'private') {
            const cooldown = user.lastMessage + 300000 - Date.now()
            if (cooldown > 0) {
                return await bot.sendMessage(chatId, `❌ Недоступно, подождите еще ${Math.floor(cooldown / 1000)} секунд!`)
            }
            user.newOrder.comment = text
            user.state = userState.none
            const thisOrder = new Order(orders.length, senderId, sender, user.newOrder.price, user.newOrder.comment)
            orders.push(thisOrder)
            thisOrder.send()
            user.lastMessage = Date.now()
            return await bot.sendMessage(chatId, `Ваш заказ отправлен разработчикам:\n\n💰Цена: ${user.newOrder.price}\n💭Комментарий: ${user.newOrder.comment}`)
        }
    } catch(e) {
        console.log(e)
    }
})

bot.on('callback_query', async msg => {
    const text = msg.data
    const sender = msg.from.username
    const senderId = msg.from.id
    const chatId = senderId

    console.log(`[callback_query]: @${sender}: ${text}`)

    if (!getUserById(senderId)) { users.push(new User(senderId, sender, chatId)) }
    let user = getUserById(senderId)

    if (text == 'makeOrder:cancel') {
        user.state = userState.none
        return await bot.sendMessage(chatId, `❌ Заказ отменен :(`)
    }
        
    if (text.startsWith('price:')) {
        let price = text.split(':')
        user.newOrder.price = price[1]
        user.state = userState.waitForComment
        return await bot.sendMessage(chatId, `Хорошо, теперь подробно опишите что вам нужно. Укажите тип работы, желаемые сроки выполнения, способ оплаты)`)
    }

    if (text.startsWith('takeOrder:')) {
        let id = text.split(':')
        if (!orders[id[1]]) { 
            return await bot.sendMessage(chatId, 'incorrect id') 
        } 
        
        try {
            orders[id[1]].markAsTaken(senderId, sender, chatId)
        } catch(e) {
            return await bot.answerCallbackQuery(msg.id, {show_alert: true, text: 'markAsTaken: ' + e, callback_query_id: msg.id}) 
        }
    }

    if (text.startsWith('cancelOrder:')) {
        let id = text.split(':')
        if (!orders[id[1]]) { return await bot.sendMessage(chatId, 'Заказ с таким номером не найден!') } 
        if (!senderId == orders[id[1]].taken.takenBy.id) {
            //return await bot.answerCallbackQuery(msg.id, {show_alert: true, text: '❌ Отменить заказ может только тот, кто его принял!', callback_query_id: msg.id})
        }
        try {
            orders[id[1]].markAsCanceled()
        } catch(e) {
            //return await bot.answerCallbackQuery(msg.id, {show_alert: true, text: 'markAsCanceled: ' + e, callback_query_id: msg.id}) 
        }
    }

    if (text.startsWith('doneOrder:')) {
        let id = text.split(':')
        if (!orders[id[1]]) { return await bot.sendMessage(chatId, 'Заказ с таким номером не найден!') } 
        if (!senderId == orders[id[1]].taken.takenBy.id) {
            return await bot.answerCallbackQuery(msg.id, {show_alert: true, text: '❌ Отметить заказ как "выполнен" может только тот, кто его принял!', callback_query_id: msg.id})
        }
        try {
            orders[id[1]].markAsDone()
        } catch(e) {
            
        }
        
    }
})