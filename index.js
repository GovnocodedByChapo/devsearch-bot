const api = require('node-telegram-bot-api')
const token = '5727778025:AAG7Knt5kXBcpijxpdR2NcPw1Ik6wgaAoCY';
const bot = new api(token, {polling: true})

const scripters_chat = -1001668697872
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
    /*{
        sender: {username: 'ya_chapo', id: -1},
        chat_id: -1,
        notification_message_id: -1,
        taken: false,
        date: {created: 'none', taken: 'none'},
        taken_by: {username: 'ya_chapo_dev', id: -1},
        done: false,
        price: 'none',
        comment: 'none'
    }*/
] 

const mainKeyboard = [
    ['🛎️ Заказать'],
    ['🧑‍💻 Список исполнителей'],
    ['⭐ Оставить отзыв']
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

    if (users[toString(senderId)].developer) {
        if (text.includes('/ban')) {
            const banUser = text.match('/ban (.+)')[1]
            if (!banUser) {
                return await bot.sendMessage(msg.chat.id, 'Ошибка, введите айди')
            }
            if (!users[banUser.toString()]) {
                return await bot.sendMessage(msg.chat.id, 'Ошибка, пользователь не найден')
            }
            users[banUser.toString()].banned = true
            return await bot.sendMessage(msg.chat.id, 'Пользователь заблокирован!')
        }
    }
    
    if (text == '/start') {
        bot.sendMessage(msg.chat.id, 'Привет, меня зовут <b>DevSearch Bot</b>, что бы заказать проект на <b>Lua, JavaScript, TypeScript, Python или C++</b> нажмите на кнопку <b>"🛎️ Заказать"</b> или введите команду /buy', {
            reply_markup: { 
                keyboard: mainKeyboard,
                parse_mode: 'HTML'
            },
        }
        )
    }else if (text == '/get_chat_id') { 
        return await bot.sendMessage(msg.chat.id, `Chat ID: ${msg.chat.id}`) 
    }else if (text === '/buy' || text == '🛎️ Заказать') {
        users[toString(senderId)].state = orderState.priceSelection
        return await bot.sendMessage(
            msg.chat.id, 'Отлично, сколько вы готовы заплатить за заказ?', {reply_markup: JSON.stringify({
                inline_keyboard: [
                    [{text: '100 - 300 рублей', callback_data: 'price:100 - 300 руб.'}, {text: '300 - 500 рублей', callback_data: 'price:300 - 500 руб.'}, {text: '100 - 500 рублей', callback_data: 'price:500 - 1000 руб.'}],
                    [{text: 'Договорится с исполнителем', callback_data: 'price:Договорная'}],
                    [{text: 'Отмена', callback_data: 'price_cancel'}]
                ]
            })}
        )
    } else if (text == '🧑‍💻 Список исполнителей') {

    } else if (text == '⭐ Оставить отзыв') {
        return await bot.sendMessage(msg.chat.id, '<b><a href="https://www.blast.hk/threads/161825/">Оставить отзыв</a></b>', {parse_mode: 'HTML'})
    }
    
    

    if (users[toString(senderId)].state == orderState.message) {
        if (text.length <= 24) {
            return await bot.sendMessage(msg.chat.id, 'Ошибка, текст слишком короткий (минимум: 24 символа)')
        }
        users[toString(senderId)].state = orderState.none
        users[toString(senderId)].new_order.comment = text
        const this_order_id = orders.length
        const notification = await bot.sendMessage(
            scripters_chat, 
            `🔔<b>Заказ </b> #${this_order_id} от @${sender} (id:<code>${msg.from.id}</code>)
    • 💰<b>Цена: </b>${users[toString(senderId)].new_order.price}
    • 💬<b>Комментарий: </b> ${users[toString(senderId)].new_order.comment}
            
    <b>Статус:</b> ✅Свободен
            `,
            {
                reply_markup: JSON.stringify({ inline_keyboard: [[{text: 'Принять заказ', callback_data: `take_order:${this_order_id}`}]]}), 
                parse_mode: 'HTML'
            }
        )
        console.log('notification')
        console.log(notification)
        orders.push(
            {
                sender: {username: sender, id: senderId},
                chat_id: notification.chat.id,
                notification_message_id: notification.message_id,
                taken: false,
                date: {created: 'none', taken: 'none'},
                taken_by: {username: 'ya_chapo_dev', id: -1},
                done: false,
                price: users[toString(senderId)].new_order.price,
                comment: users[toString(senderId)].new_order.comment
            }
        )
        return await bot.sendMessage(msg.chat.id, '✅Готово! Ваш заказ отправлен разработчикам!')
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
        const order_id = data.match('take_order:(.+)')[1]
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
        await bot.editMessageText(`🔔<b>Заказ </b> #${order_id} от @${orders[Number(order_id)].sender.username} (id:<code>${orders[Number(order_id)].sender.id}</code>)
        • 💰<b>Цена: </b>${orders[Number(order_id)].price}
        • 💬<b>Комментарий: </b> ${orders[Number(order_id)].comment}
                
        <b>Статус:</b> ❌Занят, принял: @${sender} (id:<code>${senderId}</code>))`, {
            message_id: orders[Number(order_id)].notification_message_id,
            chat_id: scripters_chat,
            parse_mode: 'HTML'
        })
        //bot.sendMessage(orders[Number(order_id)].chat_id, )
        //await bot.sendMessage(orders[Number(order_id)].chat_id, `Разработчик @${sender}(id:<code>${senderId}</code>) принял ваш заказ #${order_id}!`, {parse_mode: 'HTML'})
        console.log(`Разработчик @${sender} принял заказ #${order_id} (от @${orders[Number(order_id)].sender.username})`)
    }

    if (data == 'price_cancel' || data == 'comment_cancel') {
        users[toString(senderId)].state = orderState.none
        return await bot.sendMessage(senderId, 'Отменено.')
    }
    if (data.includes('price:')) {
        console.log('price selected!')
        const price = data.match('price:(.+)')[1]
        if (!price) { return await bot.sendMessage(senderId, 'error, price is null') }

        console.log('user price set to', price, 'was', data)
        users[toString(senderId)].new_order.price = price
        users[toString(senderId)].state = orderState.message
        return await bot.sendMessage(senderId, 'Хорошо, теперь подробно опиши то что тебе нужно (укажите язык)', {reply_markup: JSON.stringify({
            inline_keyboard: [[{text: 'Отмена', callback_data: 'comment_cancel'}]]})}
        )
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