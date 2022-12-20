const api = require('node-telegram-bot-api')
const token = '5727778025:AAG7Knt5kXBcpijxpdR2NcPw1Ik6wgaAoCY';
const bot = new api(token, {polling: true})

const scripters_chat = -1001869768154
const orderState = {
    none : 0,
    typeSelection: 1,
    priceSelection: 2,
    message: 3
}



bot.setMyCommands([
    {command: '/start', description: 'Начало работы с DevSearch'},
    {command: '/buy', description: 'Заказать'},
    {command: '/scripters', description: 'Список исполнителей'}
])

const buttons = {}
const users = {
    '1912381': {
        last_message: 0,
        banned: false,
        state: orderState.none,
        new_order: {price: 'none_price', comment: 'none_comment'},
        developer: {
            blasthack_profile: '',
            blasthack_thread: '',
            payment: '',
            contacts: ''
        },
        orders: []
    }
}

//orders
const orders = [
    {
        sender: {username: 'ya_chapo', id: -1},
        chat_id: -1,
        notification_message_id: -1,
        taken: false,
        date: {created: 'none', taken: 'none'},
        taken_by: {username: 'ya_chapo_dev', id: -1},
        done: false,
        price: 'none',
        comment: 'none'
    }
] 



bot.on('message', async msg => {
    const text = msg.text
    const sender = msg.from.username
    const senderId = msg.from.id
    if (!users[toString(senderId)]) {
        users[toString(senderId)] = {
            new_order: {price: 'none_price', comment: 'none_comment'},
            last_message: 0,
            banned: false,
            state: orderState.none,
            orders: []
        }
    }
    
    console.log(msg)

    if (text == '/get_chat_id') { return await bot.sendMessage(msg.chat.id, `Chat ID: ${msg.chat.id}`) }
    if (text === '/buy') {
        users[toString(senderId)].state = orderState.priceSelection
        return await bot.sendMessage(
            msg.chat.id, 'Отлично, сколько вы готовы заплатить за заказ?', {reply_markup: JSON.stringify({
                inline_keyboard: [
                    [{text: '100 - 500 рублей', callback_data: 'price:100 - 500 руб.'}],
                ]
            })}/*, 
            {
                reply_markup: JSON.stringify({
                    inline_keyboard: [
                        [{text: '100 - 500 рублей', callback_data: 'price:100 - 500 руб.'}], 
                        [{text: 'Договорится о цене с исполнителем', callback_data: 'price:Договорная'}]
                        [{text: 'Отмена', callback_data: 'cancel'}]
                    ]
                })
            }*/
        )
    } 
    
    

    if (users[toString(senderId)].state == orderState.message) {
        if (text.length < 24) {
            return await bot.sendMessage(msg.chat.id, 'Ошибка, текст слишком короткий (минимум: 23 символа)')
        }
        users[toString(senderId)].state = orderState.none
        const this_order_id = orders.length + 1
        await bot.sendMessage(msg.chat.id, `Новый заказ! #${this_order_id}, @${sender} (${senderId}), ${users[toString(senderId)].new_order.price}, ${users[toString(senderId)].new_order.comment}`, {reply_markup:JSON.stringify({ inline_keyboard: [[{text: 'Принять заказ', callback_data: `take_order:${this_order_id}`}]]})})
        orders.push(
            {
                sender: {username: sender, id: senderId},
                chat_id: msg.chat.id,
                notification_message_id: -1,
                taken: false,
                date: {created: 'none', taken: 'none'},
                taken_by: {username: 'ya_chapo_dev', id: -1},
                done: false,
                price: 'none',
                comment: 'none'
            }
        )
        return await bot.sendMessage(msg.chat.id, 'Ура! Ваш заказ отправлен разработчикам!')
    }
})


bot.on('callback_query', async msg => {
    const data = msg.data
    const sender = msg.from.username
    const senderId = msg.from.id
    console.log(msg)
    
    if (!users[toString(senderId)]) {
        return await bot.sendMessage(senderId, 'error, use /buy!')
    }
    console.log('[DEBUG] [CHAT DATA] callback_query:')
    console.log(msg)
    if (!sender) {
        return await bot.sendMessage(senderId, 'callback_query -> !sender')
    }

    if (data.includes('take_order:')) {
        const order_id = data.match('take_order:(.+)')
        if (!order_id) { 
            return await bot.sendMessage(senderId, 'Ошибка, order_id = null')
        }

        if (!orders[Number(order_id)]) {
            return await bot.sendMessage(senderId, `Ошибка, заказ #${order_id} не найден!`)
        }

        if (orders[Number(order_id)].taken) {
            return await bot.sendMessage(senderId, `Ошибка, заказ #${order_id} уже принят! (взял: @${orders[Number(order_id)].taken_by.username}`)
        } 
        orders[Number(order_id)].taken = true
        orders[Number(order_id)].taken_by = {username: sender, id: senderId}
        // edit message  list[Number(order_id)].notification_message_id
        console.log(`Разработчик @${sender} принял заказ #${order_id} (от @${orders[Number(order_id)].sender.username})`)
    }

    if (data.includes('price:')) {
        console.log('price selected!')
        const price = data.match('price:(.+)')
        if (!price) { return await bot.sendMessage(senderId, 'error, price is null') }

        users[toString(senderId)].new_order.price = price
        users[toString(senderId)].state = orderState.message
        return await bot.sendMessage(senderId, 'Хорошо, теперь подробно опиши то что тебе нужно (укажите язык)')
    }
    
})





/*

function isUserAdmin(username) {
    for (var index = 0; index < users.length; index ++) {
        if (username === users[index]) {
            return true;
        }
    }
    return false;
}

function isUserBanned(username) {
    for (var index = 0; index < banned_users.length; index ++) {
        if (username === banned_users[index]) {
            return true;
        }
    }
    return false;
}

-------


    if (isUserBanned(sender)) { return await bot.sendMessage(msg.from.id, 'Ошибка, вы заблокированы!') }
    if (!msg.from && !isUserAdmin(sender)) { return await bot.sendMessage(msg.from.id, 'Бот доступен только в личных сообщениях') } 

    // admin commands
    if (isUserAdmin(sender)) {
        if (text.includes('/ban')) {
            const ban_user = text.match('/ban @(.+)')
            if (!ban_user) { 
                return await bot.sendMessage(msg.from.id, 'Ошибка, неверный юзернейм!')
            } 
            if (isUserBanned(ban_user)) {
                return await bot.sendMessage(msg.from.id, 'Ошибка, пользователь уже заблокирован!')
            }
            if (isUserAdmin(ban_user)) {
                return await bot.sendMessage(msg.from.id, 'Ошибка, вы не можете заблокировать администратора!')
            }
            banned_users.push(ban_user)
            return await bot.sendMessage(msg.from.id, `Пользователь @${ban_user} заблокирован!`)
        }
    }
    */