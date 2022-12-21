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
const mainKeyboard = [
    ['🛎️ Заказать'],
    ['🧑‍💻 Список исполнителей'],
    ['⭐ Оставить отзыв']
] 

let users = {
    '407057857': {
        last_message: 0,
        banned: false,
        state: orderState.none,
        new_order: {price: '', comment: ''},
        developer: {
            blasthack_profile: 'https://www.blast.hk/members/112329/',
            blasthack_thread: 'https://www.blast.hk/threads/109259/',
            payment: 'QIWI, СБЕР',
            contacts: 'tg: @ya_chapo, vk: @ya_chapo'
        },
        orders: []
    }
}
let banlist = []
let orders = []
/*
"orders" item example: 
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
*/



bot.setMyCommands([
    {command: '/start', description: 'Начало работы с DevSearch'},
    {command: '/buy', description: 'Заказать'},
    {command: '/scripters', description: 'Список исполнителей'}
])

// Callbacks
bot.on('message', async msg => {
    const text = msg.text
    const sender = msg.from.username
    const senderId = msg.from.id   
    console.log(msg)
    
    try {
        // does user exists in "db" xd
        if (!users[senderId]) {
            users[senderId] = {
                new_order: {price: 'none_price', comment: 'none_comment'},
                last_message: 0,
                banned: false,
                state: orderState.none,
                orders: []
            }
        }

       

        // dev commands
        if (users[senderId].developer) {
            if (text == '/banlist') {
                return await bot.sendMessage(msg.chat.id, `Забаненные пользователи:\n${banlist.join('\n\t')}`)
            } else if (text.includes('/ban')) {
                let banUser = text.match('/ban (.+)')
                if (!banUser) { return await bot.sendMessage(msg.chat.id, 'Ошибка, введите айди') }
                banlist.push(Number(banUser[1]))
                return await bot.sendMessage(msg.chat.id, `Пользователь ${banUser[1]} заблокирован!`)
            } else if (text.includes('/unban')) {
                let banUser = text.match('/unban (.+)')
                if (!banUser) { return await bot.sendMessage(msg.chat.id, 'Ошибка, введите айди') }
                if (!banlist.includes(Number(banUser[1]))) { return await bot.sendMessage(msg.chat.id, `Ошибка, пользователь ${banUser[1]} не заблокирован!`) }
                banlist = banlist.filter(v => v !== Number(banUser[1]))
                return await bot.sendMessage(msg.chat.id, `Пользователь ${banUser[1]} разблокирован!`)
            } 
        }

        // is user developer
        if (text == '/ya_razrab_ili_cho') {
            return await bot.sendMessage(msg.chat.id, `user ${senderId} ${users[senderId].developer ? '+' : '-'}`)
        }

        // is user banned
        if (banlist.includes(senderId)) {
            return await bot.sendPhoto(msg.chat.id, 'https://cdn.discordapp.com/attachments/854686750168186880/1055096544094855178/image.png', {caption: '❌ Ошибка, вы заблокированы!'})
        }

        if (msg.chat.type != 'private' && msg.chat.id != scripters_chat) { return }
        
        if (text == '/start') {
            bot.sendMessage(msg.chat.id, 'Привет, меня зовут <b>DevSearch Bot</b>, что бы заказать проект на <b>Lua, JavaScript, TypeScript, Python или C++</b> нажмите на кнопку <b>"🛎️ Заказать"</b> или введите команду /buy', 
                {
                    reply_markup: { keyboard: mainKeyboard },
                    parse_mode: 'HTML'
                }
            )
        }else if (text == '/get_chat_id') { 
            return await bot.sendMessage(msg.chat.id, `Chat ID: ${msg.chat.id}`) 
        }else if (text === '/buy' || text == '🛎️ Заказать') {
            users[senderId].state = orderState.priceSelection
            return await bot.sendMessage(
                msg.chat.id, 'Отлично, сколько вы готовы заплатить за заказ?', {reply_markup: JSON.stringify({
                    inline_keyboard: [
                        [{text: '100 - 300 рублей', callback_data: 'price:100 - 300 руб.'}, {text: '300 - 500 рублей', callback_data: 'price:300 - 500 руб.'}, {text: '100 - 500 рублей', callback_data: 'price:500 - 1000 руб.'}],
                        [{text: 'Договориться с исполнителем', callback_data: 'price:Договорная'}],
                        [{text: 'Отмена', callback_data: 'price_cancel'}]
                    ]
                })}
            )
        } else if (text == '🧑‍💻 Список исполнителей') {
            return await bot.sendMessage(msg.chat.id, 'В разработке :)', {parse_mode: 'HTML'})
        } else if (text == '⭐ Оставить отзыв') {
            return await bot.sendMessage(msg.chat.id, '<b><a href="https://www.blast.hk/threads/161825/">Оставить отзыв</a></b>', {parse_mode: 'HTML'})
        } else {
            if (users[senderId].state == orderState.message) {
                if (text.length <= 24) {
                    return await bot.sendMessage(msg.chat.id, 'Ошибка, текст слишком короткий (минимум: 24 символа)')
                }
                
                
                // anti flood
                const cooldown = users[senderId].last_message + 300000 - Date.now()
                if (cooldown <= 0) {
                    users[senderId].state = orderState.none
                    users[senderId].new_order.comment = text
                    const this_order_id = orders.length
                    const notification = await bot.sendMessage(
                        scripters_chat, 
                        //`🔔<b>Новый заказ!</b>\n🙍‍♂️<b>Заказчик:</b>@${orders[Number(order_id)].sender.username} (id:<code>${orders[Number(order_id)].sender.id}</code>)\n💰<b>Цена: </b>${orders[Number(order_id)].price}\n💬<b>Комментарий: </b> ${orders[Number(order_id)].comment}\n\n❌ <b>Статус:</b> Занят, принял: @${sender} (id:<code>${senderId}</code>)`, {
                        `🔔<b>Новый заказ!</b>\n🙍‍♂️<b>Заказчик:</b> @${sender} (id:<code>${msg.from.id}</code>)\n💰<b>Цена: </b>${users[senderId].new_order.price}\n💬<b>Комментарий: </b> ${users[senderId].new_order.comment}\n\n✅<b>Статус:</b> Свободен`,
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
                            price: users[senderId].new_order.price,
                            comment: users[senderId].new_order.comment
                        }
                    )
                    bot.pinChatMessage(scripters_chat, notification.message_id)
                    users[senderId].last_message = Date.now()
                    return await bot.sendMessage(msg.chat.id, '✅Готово! Ваш заказ отправлен разработчикам!')
                } else {
                    return await bot.sendMessage(msg.chat.id, `❌ Недоступно, подождите еще ${Math.floor(cooldown / 1000)} секунд!`)
                }
            }
        }
    } catch(err) {
        //return await bot.sendMessage(msg.chat.id, `ERROR IN 'message':\n${err}`)
    }
})


bot.on('callback_query', async msg => {
    const data = msg.data
    const sender = msg.from.username
    const senderId = msg.from.id
    console.log(msg)
    
    
    try {
        if (banlist.includes(senderId)) { return await bot.sendMessage(msg.chat.id, '❌ Ошибка, вы заблокированы!') }
        //if (!users[senderId]) { return await bot.sendMessage(senderId, 'Что-то пошло не так, используйте /start :(') }
        if (!sender) { return await bot.sendMessage(senderId, 'callback_query -> !sender') }

        // take order
        if (data.includes('take_order:')) {
            const order_id = data.match('take_order:(.+)')[1]
            if (!order_id) { return await bot.sendMessage(senderId, 'Ошибка, order_id = null') }
            if (!orders[Number(order_id)]) { return await bot.sendMessage(senderId, `Ошибка, заказ #${order_id} не найден!`) }
            if (orders[Number(order_id)].taken) { return await bot.sendMessage(senderId, `Ошибка, заказ #${order_id} уже принят! (взял: @${orders[Number(order_id)].taken_by.username}`) } 
            orders[Number(order_id)].taken = true
            orders[Number(order_id)].taken_by = {username: sender, id: senderId}
            await bot.editMessageText(`🔔<b>Новый заказ!</b>\n🙍‍♂️<b>Заказчик:</b>@${orders[Number(order_id)].sender.username} (id:<code>${orders[Number(order_id)].sender.id}</code>)\n💰<b>Цена: </b>${orders[Number(order_id)].price}\n💬<b>Комментарий: </b> ${orders[Number(order_id)].comment}\n\n❌ <b>Статус:</b> Занят, принял: @${sender} (id:<code>${senderId}</code>)`, {
                message_id: orders[Number(order_id)].notification_message_id,
                chat_id: scripters_chat,
                parse_mode: 'HTML',
                reply_markup: JSON.stringify({ inline_keyboard: [[{text: `❌ Отменить`, callback_data: `cancel_order:${order_id}`}, {text: `✔️ Заказ выполнен`, callback_data: `done_order:${order_id}`}]]}), 
            })
            await bot.unpinChatMessage(scripters_chat, {message_id: orders[Number(order_id)].notification_message_id})
            console.log(`Разработчик @${sender} принял заказ #${order_id} (от @${orders[Number(order_id)].sender.username})`)
        }

        // cancel order
        if (data.includes('cancel_order:')) {
            const order_id = data.match('cancel_order:(.+)')[1]
            if (!order_id) { return await bot.sendMessage(senderId, 'Ошибка, order_id = null') }
            if (!orders[Number(order_id)]) { return await bot.sendMessage(senderId, `Ошибка, заказ #${order_id} не найден!`) }
            //if (orders[Number(order_id)].taken) { return await bot.sendMessage(senderId, `Ошибка, заказ #${order_id} уже принят! (взял: @${orders[Number(order_id)].taken_by.username}`) } 
            if (senderId == orders[Number(order_id)].taken_by.id) {
                orders[Number(order_id)].taken = false
                orders[Number(order_id)].taken_by = {username: 'undefined', id: -1}
                await bot.editMessageText(`🔔<b>Заказ </b> #${order_id} от @${orders[Number(order_id)].sender.username} (id:<code>${orders[Number(order_id)].sender.id}</code>)\n• 💰<b>Цена: </b>${orders[Number(order_id)].price}\n• 💬<b>Комментарий: </b> ${orders[Number(order_id)].comment}\n-\n<b>Статус:</b> ✅Cвободен`, {
                    message_id: orders[Number(order_id)].notification_message_id,
                    chat_id: scripters_chat,
                    parse_mode: 'HTML',
                    reply_markup: JSON.stringify({ inline_keyboard: [[{text: `✅ Принять`, callback_data: `take_order:${order_id}`}]]}), 
                })
                console.log(`Разработчик @${sender} ОТМЕНИЛ заказ #${order_id} (от @${orders[Number(order_id)].sender.username})`)
            } else {
                return await bot.answerCallbackQuery(msg.id, {show_alert: true, text: '❌ Отменить заказ может только тот, кто его принял!', callback_query_id: msg.id})
            }
        }

        // mark order as done
        if (data.includes('done_order:')) {
            const order_id = data.match('done_order:(.+)')[1]
            if (!order_id) { return await bot.sendMessage(senderId, 'Ошибка, order_id = null') }
            if (!orders[Number(order_id)]) { return await bot.sendMessage(senderId, `Ошибка, заказ #${order_id} не найден!`) }
            //if (orders[Number(order_id)].taken) { return await bot.sendMessage(senderId, `Ошибка, заказ #${order_id} уже принят! (взял: @${orders[Number(order_id)].taken_by.username}`) } 
            if (senderId == orders[Number(order_id)].taken_by.id) {
                orders[Number(order_id)].done = true
                await bot.editMessageText(`✅<b>Выполнил:</b> @${orders[Number(order_id)].taken_by.username}\n🔔<b>Заказ </b> #${order_id} от @${orders[Number(order_id)].sender.username} (id:<code>${orders[Number(order_id)].sender.id}</code>)\n💰<b>Цена: </b>${orders[Number(order_id)].price}\n💬<b>Комментарий: </b> ${orders[Number(order_id)].comment}`, {
                    message_id: orders[Number(order_id)].notification_message_id,
                    chat_id: scripters_chat,
                    parse_mode: 'HTML',
                    //reply_markup: JSON.stringify({ inline_keyboard: [[{text: `✅ Принять`, callback_data: `take_order:${order_id}`}]]}), 
                })
                await bot.unpinChatMessage(scripters_chat, {message_id: orders[Number(order_id)].notification_message_id})
                console.log(`Разработчик @${sender} ВЫПОЛНИЛ заказ #${order_id} (от @${orders[Number(order_id)].sender.username})`)
            } else {
                return await bot.answerCallbackQuery(msg.id, {show_alert: true, text: '❌ Отметить заказ как "выполнен" может только тот, кто его принял!', callback_query_id: msg.id})
            }
        }
    
        if (data == 'price_cancel' || data == 'comment_cancel') {
            users[senderId].state = orderState.none
            return await bot.sendMessage(senderId, 'Отменено.')
        }
        if (data.includes('price:')) {
            console.log('price selected!')
            const price = data.match('price:(.+)')[1]
            if (!price) { return await bot.sendMessage(senderId, 'error, price is null') }
    
            console.log('user price set to', price, 'was', data)
            users[senderId].new_order.price = price
            users[senderId].state = orderState.message
            return await bot.sendMessage(senderId, 'Хорошо, теперь <b>подробно</b> опиши то что тебе нужно (укажи желаемые сроки, язык и способ оплаты)', {parse_mode: 'HTML', reply_markup: JSON.stringify({inline_keyboard: [[{text: 'Отмена', callback_data: 'comment_cancel'}]]})})
        }
    } catch(err) {
        //return await bot.sendMessage(senderId, `ERROR IN 'callback_query':\n${err}`)
    }
})


const LANG = {
    RU: 0,
    EN: 1
}
const lang = LANG.RU
const text = {
    hello: [
        'Привет',
        'Hello'
    ]
}

console.log(text.hello[lang])