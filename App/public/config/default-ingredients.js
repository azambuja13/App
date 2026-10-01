/**
 * Lista completa de ingredientes para eventos de churrasco
 * Inclui todos os cortes de carnes, peixes, frutos do mar e acompanhamentos
 */

console.log('🔥 Carregando default-ingredients.js...');

const DEFAULT_INGREDIENTS = [
    // ========== CARNES BOVINAS - PRIMEIRA ==========
    { name: 'Picanha', unit: 'kg', category: 'Proteínas' },
    { name: 'Picanha Fatiada', unit: 'kg', category: 'Proteínas' },
    { name: 'Contrafilé', unit: 'kg', category: 'Proteínas' },
    { name: 'Contrafilé com Osso (T-Bone)', unit: 'kg', category: 'Proteínas' },
    { name: 'Alcatra', unit: 'kg', category: 'Proteínas' },
    { name: 'Maminha', unit: 'kg', category: 'Proteínas' },
    { name: 'Maminha em Tiras', unit: 'kg', category: 'Proteínas' },
    { name: 'Fraldinha', unit: 'kg', category: 'Proteínas' },
    { name: 'Vazio (Flank Steak)', unit: 'kg', category: 'Proteínas' },
    { name: 'Ancho (Entrecot)', unit: 'kg', category: 'Proteínas' },
    { name: 'Chorizo (Contrafilé Argentino)', unit: 'kg', category: 'Proteínas' },
    { name: 'Bife Ancho', unit: 'kg', category: 'Proteínas' },

    // ========== CARNES BOVINAS - COSTELAS ==========
    { name: 'Costela Bovina', unit: 'kg', category: 'Proteínas' },
    { name: 'Costela Bovina no Bafo', unit: 'kg', category: 'Proteínas' },
    { name: 'Costela Ripa', unit: 'kg', category: 'Proteínas' },
    { name: 'Costela Minga', unit: 'kg', category: 'Proteínas' },
    { name: 'Costela Janela', unit: 'kg', category: 'Proteínas' },
    { name: 'Prime Rib', unit: 'kg', category: 'Proteínas' },
    { name: 'Short Ribs (Costela em Cubos)', unit: 'kg', category: 'Proteínas' },
    { name: 'Asado de Tira', unit: 'kg', category: 'Proteínas' },

    // ========== CARNES BOVINAS - CUPIM E NOBRES ==========
    { name: 'Cupim', unit: 'kg', category: 'Proteínas' },
    { name: 'Cupim Defumado', unit: 'kg', category: 'Proteínas' },
    { name: 'Filé Mignon', unit: 'kg', category: 'Proteínas' },
    { name: 'Filé Mignon Suíno', unit: 'kg', category: 'Proteínas' },
    { name: 'Filé de Costela (Rib Eye)', unit: 'kg', category: 'Proteínas' },
    { name: 'Baby Beef', unit: 'kg', category: 'Proteínas' },
    { name: 'Tomahawk Steak', unit: 'kg', category: 'Proteínas' },

    // ========== CARNES BOVINAS - OUTROS CORTES ==========
    { name: 'Patinho', unit: 'kg', category: 'Proteínas' },
    { name: 'Coxão Mole', unit: 'kg', category: 'Proteínas' },
    { name: 'Coxão Duro', unit: 'kg', category: 'Proteínas' },
    { name: 'Acém', unit: 'kg', category: 'Proteínas' },
    { name: 'Músculo', unit: 'kg', category: 'Proteínas' },
    { name: 'Lagarto', unit: 'kg', category: 'Proteínas' },
    { name: 'Paleta', unit: 'kg', category: 'Proteínas' },
    { name: 'Ponta de Agulha', unit: 'kg', category: 'Proteínas' },
    { name: 'Peito Bovino', unit: 'kg', category: 'Proteínas' },
    { name: 'Brisket (Peito Defumado)', unit: 'kg', category: 'Proteínas' },

    // ========== CARNES BOVINAS - MIÚDOS ==========
    { name: 'Coração Bovino', unit: 'kg', category: 'Proteínas' },
    { name: 'Coração de Galinha', unit: 'kg', category: 'Proteínas' },
    { name: 'Fígado Bovino', unit: 'kg', category: 'Proteínas' },
    { name: 'Rim Bovino', unit: 'kg', category: 'Proteínas' },
    { name: 'Moela', unit: 'kg', category: 'Proteínas' },
    { name: 'Língua Bovina', unit: 'kg', category: 'Proteínas' },

    // ========== CARNES SUÍNAS ==========
    { name: 'Lombo Suíno', unit: 'kg', category: 'Proteínas' },
    { name: 'Lombo Suíno Recheado', unit: 'kg', category: 'Proteínas' },
    { name: 'Lombo Suíno Defumado', unit: 'kg', category: 'Proteínas' },
    { name: 'Pernil Suíno', unit: 'kg', category: 'Proteínas' },
    { name: 'Pernil Suíno Desossado', unit: 'kg', category: 'Proteínas' },
    { name: 'Costelinha Suína', unit: 'kg', category: 'Proteínas' },
    { name: 'Costelinha Suína BBQ', unit: 'kg', category: 'Proteínas' },
    { name: 'Bisteca Suína', unit: 'kg', category: 'Proteínas' },
    { name: 'Pancetta', unit: 'kg', category: 'Proteínas' },
    { name: 'Bacon', unit: 'kg', category: 'Proteínas' },
    { name: 'Bacon em Tiras', unit: 'kg', category: 'Proteínas' },
    { name: 'Barriga Suína (Pork Belly)', unit: 'kg', category: 'Proteínas' },
    { name: 'Joelho Suíno (Eisbein)', unit: 'kg', category: 'Proteínas' },
    { name: 'Cupim Suíno', unit: 'kg', category: 'Proteínas' },
    { name: 'Kafta Suína', unit: 'kg', category: 'Proteínas' },

    // ========== LINGUIÇAS E EMBUTIDOS ==========
    { name: 'Linguiça Toscana', unit: 'kg', category: 'Proteínas' },
    { name: 'Linguiça Calabresa', unit: 'kg', category: 'Proteínas' },
    { name: 'Linguiça Paio', unit: 'kg', category: 'Proteínas' },
    { name: 'Linguiça Portuguesa', unit: 'kg', category: 'Proteínas' },
    { name: 'Linguiça Artesanal', unit: 'kg', category: 'Proteínas' },
    { name: 'Linguiça de Pernil', unit: 'kg', category: 'Proteínas' },
    { name: 'Linguiça de Frango', unit: 'kg', category: 'Proteínas' },
    { name: 'Linguiça Defumada', unit: 'kg', category: 'Proteínas' },
    { name: 'Salsicha Hot Dog', unit: 'kg', category: 'Proteínas' },
    { name: 'Salsicha Alemã', unit: 'kg', category: 'Proteínas' },
    { name: 'Chorizo Espanhol', unit: 'kg', category: 'Proteínas' },
    { name: 'Morcela (Chouriço de Sangue)', unit: 'kg', category: 'Proteínas' },

    // ========== AVES - FRANGO ==========
    { name: 'Peito de Frango', unit: 'kg', category: 'Proteínas' },
    { name: 'Peito de Frango Desossado', unit: 'kg', category: 'Proteínas' },
    { name: 'Coxa de Frango', unit: 'kg', category: 'Proteínas' },
    { name: 'Sobrecoxa de Frango', unit: 'kg', category: 'Proteínas' },
    { name: 'Sobrecoxa Desossada', unit: 'kg', category: 'Proteínas' },
    { name: 'Asa de Frango', unit: 'kg', category: 'Proteínas' },
    { name: 'Tulipa de Frango', unit: 'kg', category: 'Proteínas' },
    { name: 'Coxinha da Asa', unit: 'kg', category: 'Proteínas' },
    { name: 'Frango Inteiro', unit: 'kg', category: 'Proteínas' },
    { name: 'Frango a Passarinho', unit: 'kg', category: 'Proteínas' },
    { name: 'Espetinho de Frango', unit: 'kg', category: 'Proteínas' },

    // ========== AVES - OUTRAS ==========
    { name: 'Chester', unit: 'kg', category: 'Proteínas' },
    { name: 'Peito de Chester', unit: 'kg', category: 'Proteínas' },
    { name: 'Peru Inteiro', unit: 'kg', category: 'Proteínas' },
    { name: 'Peito de Peru', unit: 'kg', category: 'Proteínas' },
    { name: 'Pernil de Peru', unit: 'kg', category: 'Proteínas' },
    { name: 'Codorna', unit: 'kg', category: 'Proteínas' },
    { name: 'Codorna Desossada', unit: 'kg', category: 'Proteínas' },
    { name: 'Pato', unit: 'kg', category: 'Proteínas' },
    { name: 'Peito de Pato', unit: 'kg', category: 'Proteínas' },

    // ========== CARNEIRO E CORDEIRO ==========
    { name: 'Pernil de Cordeiro', unit: 'kg', category: 'Proteínas' },
    { name: 'Paleta de Cordeiro', unit: 'kg', category: 'Proteínas' },
    { name: 'Carré de Cordeiro', unit: 'kg', category: 'Proteínas' },
    { name: 'Costela de Cordeiro', unit: 'kg', category: 'Proteínas' },
    { name: 'Lombo de Cordeiro', unit: 'kg', category: 'Proteínas' },
    { name: 'Picanha de Cordeiro', unit: 'kg', category: 'Proteínas' },
    { name: 'Cordeiro Inteiro', unit: 'kg', category: 'Proteínas' },
    { name: 'Kafta de Cordeiro', unit: 'kg', category: 'Proteínas' },
    { name: 'Pernil de Carneiro', unit: 'kg', category: 'Proteínas' },
    { name: 'Costela de Carneiro', unit: 'kg', category: 'Proteínas' },

    // ========== PEIXES - ÁGUA SALGADA ==========
    { name: 'Salmão', unit: 'kg', category: 'Proteínas' },
    { name: 'Salmão em Postas', unit: 'kg', category: 'Proteínas' },
    { name: 'Salmão em Filé', unit: 'kg', category: 'Proteínas' },
    { name: 'Atum', unit: 'kg', category: 'Proteínas' },
    { name: 'Atum em Postas', unit: 'kg', category: 'Proteínas' },
    { name: 'Robalo', unit: 'kg', category: 'Proteínas' },
    { name: 'Badejo', unit: 'kg', category: 'Proteínas' },
    { name: 'Namorado', unit: 'kg', category: 'Proteínas' },
    { name: 'Merluza', unit: 'kg', category: 'Proteínas' },
    { name: 'Pescada', unit: 'kg', category: 'Proteínas' },
    { name: 'Linguado', unit: 'kg', category: 'Proteínas' },
    { name: 'Garoupa', unit: 'kg', category: 'Proteínas' },
    { name: 'Pargo', unit: 'kg', category: 'Proteínas' },
    { name: 'Dourado', unit: 'kg', category: 'Proteínas' },
    { name: 'Anchova', unit: 'kg', category: 'Proteínas' },
    { name: 'Sardinha', unit: 'kg', category: 'Proteínas' },
    { name: 'Cavala', unit: 'kg', category: 'Proteínas' },

    // ========== PEIXES - ÁGUA DOCE ==========
    { name: 'Tilápia', unit: 'kg', category: 'Proteínas' },
    { name: 'Tilápia em Filé', unit: 'kg', category: 'Proteínas' },
    { name: 'Pintado', unit: 'kg', category: 'Proteínas' },
    { name: 'Tambaqui', unit: 'kg', category: 'Proteínas' },
    { name: 'Pirarucu', unit: 'kg', category: 'Proteínas' },
    { name: 'Tucunaré', unit: 'kg', category: 'Proteínas' },
    { name: 'Pacu', unit: 'kg', category: 'Proteínas' },
    { name: 'Truta', unit: 'kg', category: 'Proteínas' },
    { name: 'Traíra', unit: 'kg', category: 'Proteínas' },

    // ========== FRUTOS DO MAR - CAMARÕES ==========
    { name: 'Camarão Médio', unit: 'kg', category: 'Proteínas' },
    { name: 'Camarão Grande', unit: 'kg', category: 'Proteínas' },
    { name: 'Camarão Jumbo', unit: 'kg', category: 'Proteínas' },
    { name: 'Camarão VG (Very Giant)', unit: 'kg', category: 'Proteínas' },
    { name: 'Camarão Rosa', unit: 'kg', category: 'Proteínas' },
    { name: 'Camarão 7 Barbas', unit: 'kg', category: 'Proteínas' },
    { name: 'Camarão Cinza', unit: 'kg', category: 'Proteínas' },
    { name: 'Lagosta', unit: 'kg', category: 'Proteínas' },
    { name: 'Lagostim', unit: 'kg', category: 'Proteínas' },

    // ========== FRUTOS DO MAR - MOLUSCOS ==========
    { name: 'Polvo', unit: 'kg', category: 'Proteínas' },
    { name: 'Lula', unit: 'kg', category: 'Proteínas' },
    { name: 'Lula em Anéis', unit: 'kg', category: 'Proteínas' },
    { name: 'Mexilhão', unit: 'kg', category: 'Proteínas' },
    { name: 'Ostra', unit: 'kg', category: 'Proteínas' },
    { name: 'Vieira', unit: 'kg', category: 'Proteínas' },
    { name: 'Marisco', unit: 'kg', category: 'Proteínas' },
    { name: 'Vongole', unit: 'kg', category: 'Proteínas' },

    // ========== FRUTOS DO MAR - CRUSTÁCEOS ==========
    { name: 'Caranguejo', unit: 'kg', category: 'Proteínas' },
    { name: 'Siri', unit: 'kg', category: 'Proteínas' },

    // ========== QUEIJOS PARA CHURRASCO ==========
    { name: 'Queijo Coalho', unit: 'kg', category: 'Lácteos' },
    { name: 'Queijo Minas', unit: 'kg', category: 'Lácteos' },
    { name: 'Queijo Provolone', unit: 'kg', category: 'Lácteos' },
    { name: 'Queijo Camembert', unit: 'kg', category: 'Lácteos' },
    { name: 'Queijo Brie', unit: 'kg', category: 'Lácteos' },
    { name: 'Queijo Gorgonzola', unit: 'kg', category: 'Lácteos' },
    { name: 'Queijo Parmesão', unit: 'kg', category: 'Lácteos' },
    { name: 'Queijo Muçarela', unit: 'kg', category: 'Lácteos' },
    { name: 'Queijo Prato', unit: 'kg', category: 'Lácteos' },
    { name: 'Requeijão', unit: 'kg', category: 'Lácteos' },

    // ========== VEGETAIS PARA CHURRASCO ==========
    { name: 'Tomate', unit: 'kg', category: 'Vegetais' },
    { name: 'Tomate Cereja', unit: 'kg', category: 'Vegetais' },
    { name: 'Cebola', unit: 'kg', category: 'Vegetais' },
    { name: 'Cebola Roxa', unit: 'kg', category: 'Vegetais' },
    { name: 'Pimentão Verde', unit: 'kg', category: 'Vegetais' },
    { name: 'Pimentão Vermelho', unit: 'kg', category: 'Vegetais' },
    { name: 'Pimentão Amarelo', unit: 'kg', category: 'Vegetais' },
    { name: 'Alho', unit: 'kg', category: 'Vegetais' },
    { name: 'Batata', unit: 'kg', category: 'Vegetais' },
    { name: 'Batata Doce', unit: 'kg', category: 'Vegetais' },
    { name: 'Mandioca', unit: 'kg', category: 'Vegetais' },
    { name: 'Abobrinha', unit: 'kg', category: 'Vegetais' },
    { name: 'Berinjela', unit: 'kg', category: 'Vegetais' },
    { name: 'Cogumelo Paris', unit: 'kg', category: 'Vegetais' },
    { name: 'Cogumelo Portobello', unit: 'kg', category: 'Vegetais' },
    { name: 'Cogumelo Shitake', unit: 'kg', category: 'Vegetais' },
    { name: 'Milho Verde', unit: 'kg', category: 'Vegetais' },
    { name: 'Espiga de Milho', unit: 'unidade', category: 'Vegetais' },
    { name: 'Palmito', unit: 'kg', category: 'Vegetais' },
    { name: 'Aspargo', unit: 'kg', category: 'Vegetais' },
    { name: 'Cenoura', unit: 'kg', category: 'Vegetais' },

    // ========== SALADAS E FOLHAS ==========
    { name: 'Alface Americana', unit: 'kg', category: 'Vegetais' },
    { name: 'Alface Crespa', unit: 'kg', category: 'Vegetais' },
    { name: 'Alface Roxa', unit: 'kg', category: 'Vegetais' },
    { name: 'Rúcula', unit: 'kg', category: 'Vegetais' },
    { name: 'Agrião', unit: 'kg', category: 'Vegetais' },
    { name: 'Repolho', unit: 'kg', category: 'Vegetais' },
    { name: 'Repolho Roxo', unit: 'kg', category: 'Vegetais' },
    { name: 'Pepino', unit: 'kg', category: 'Vegetais' },
    { name: 'Rabanete', unit: 'kg', category: 'Vegetais' },
    { name: 'Brócolis', unit: 'kg', category: 'Vegetais' },
    { name: 'Couve-flor', unit: 'kg', category: 'Vegetais' },

    // ========== ACOMPANHAMENTOS - BÁSICOS ==========
    { name: 'Arroz Branco', unit: 'kg', category: 'Carboidratos' },
    { name: 'Arroz à Grega', unit: 'kg', category: 'Carboidratos' },
    { name: 'Arroz Integral', unit: 'kg', category: 'Carboidratos' },
    { name: 'Arroz 7 Grãos', unit: 'kg', category: 'Carboidratos' },
    { name: 'Feijão Preto', unit: 'kg', category: 'Carboidratos' },
    { name: 'Feijão Carioca', unit: 'kg', category: 'Carboidratos' },
    { name: 'Feijão Tropeiro', unit: 'kg', category: 'Carboidratos' },
    { name: 'Tutu de Feijão', unit: 'kg', category: 'Carboidratos' },
    { name: 'Macarrão', unit: 'kg', category: 'Carboidratos' },
    { name: 'Macarrão Alho e Óleo', unit: 'kg', category: 'Carboidratos' },

    // ========== ACOMPANHAMENTOS - FAROFAS ==========
    { name: 'Farofa Simples', unit: 'kg', category: 'Carboidratos' },
    { name: 'Farofa de Bacon', unit: 'kg', category: 'Carboidratos' },
    { name: 'Farofa de Linguiça', unit: 'kg', category: 'Carboidratos' },
    { name: 'Farofa Completa', unit: 'kg', category: 'Carboidratos' },
    { name: 'Farofa de Mandioca', unit: 'kg', category: 'Carboidratos' },
    { name: 'Farinha de Mandioca', unit: 'kg', category: 'Carboidratos' },
    { name: 'Farinha Temperada', unit: 'kg', category: 'Carboidratos' },

    // ========== ACOMPANHAMENTOS - MASSAS ==========
    { name: 'Polenta', unit: 'kg', category: 'Carboidratos' },
    { name: 'Polenta Frita', unit: 'kg', category: 'Carboidratos' },
    { name: 'Angu', unit: 'kg', category: 'Carboidratos' },
    { name: 'Purê de Batata', unit: 'kg', category: 'Carboidratos' },
    { name: 'Purê de Mandioca', unit: 'kg', category: 'Carboidratos' },
    { name: 'Batata Frita', unit: 'kg', category: 'Carboidratos' },
    { name: 'Batata Rústica', unit: 'kg', category: 'Carboidratos' },
    { name: 'Batata Assada', unit: 'kg', category: 'Carboidratos' },
    { name: 'Mandioca Frita', unit: 'kg', category: 'Carboidratos' },
    { name: 'Mandioca Cozida', unit: 'kg', category: 'Carboidratos' },

    // ========== MOLHOS E CONSERVAS ==========
    { name: 'Vinagrete', unit: 'kg', category: 'Temperos' },
    { name: 'Chimichurri', unit: 'L', category: 'Temperos' },
    { name: 'Molho Barbecue', unit: 'L', category: 'Temperos' },
    { name: 'Molho Tártaro', unit: 'L', category: 'Temperos' },
    { name: 'Molho de Alho', unit: 'L', category: 'Temperos' },
    { name: 'Molho Shoyu', unit: 'L', category: 'Temperos' },
    { name: 'Molho Teriyaki', unit: 'L', category: 'Temperos' },
    { name: 'Molho de Pimenta', unit: 'L', category: 'Temperos' },
    { name: 'Molho Rosé', unit: 'L', category: 'Temperos' },
    { name: 'Maionese', unit: 'kg', category: 'Temperos' },
    { name: 'Maionese Caseira', unit: 'kg', category: 'Temperos' },
    { name: 'Mostarda', unit: 'kg', category: 'Temperos' },
    { name: 'Ketchup', unit: 'kg', category: 'Temperos' },
    { name: 'Geleia de Pimenta', unit: 'kg', category: 'Temperos' },

    // ========== PÃES ==========
    { name: 'Pão Francês', unit: 'unidade', category: 'Carboidratos' },
    { name: 'Pão de Alho', unit: 'unidade', category: 'Carboidratos' },
    { name: 'Pão Sírio', unit: 'unidade', category: 'Carboidratos' },
    { name: 'Pão Italiano', unit: 'unidade', category: 'Carboidratos' },
    { name: 'Pão Australiano', unit: 'unidade', category: 'Carboidratos' },
    { name: 'Pão de Forma', unit: 'unidade', category: 'Carboidratos' },
    { name: 'Pão de Hambúrguer', unit: 'unidade', category: 'Carboidratos' },
    { name: 'Pão de Hot Dog', unit: 'unidade', category: 'Carboidratos' },

    // ========== TEMPEROS E CONDIMENTOS ==========
    { name: 'Sal', unit: 'kg', category: 'Temperos' },
    { name: 'Sal Grosso', unit: 'kg', category: 'Temperos' },
    { name: 'Sal de Parrilla', unit: 'kg', category: 'Temperos' },
    { name: 'Sal Defumado', unit: 'kg', category: 'Temperos' },
    { name: 'Sal Rosa do Himalaia', unit: 'kg', category: 'Temperos' },
    { name: 'Pimenta do Reino Preta', unit: 'g', category: 'Temperos' },
    { name: 'Pimenta do Reino Branca', unit: 'g', category: 'Temperos' },
    { name: 'Pimenta Calabresa', unit: 'g', category: 'Temperos' },
    { name: 'Pimenta Biquinho', unit: 'g', category: 'Temperos' },
    { name: 'Pimenta Dedo-de-moça', unit: 'g', category: 'Temperos' },
    { name: 'Pimenta Malagueta', unit: 'g', category: 'Temperos' },
    { name: 'Pimenta Jalapeño', unit: 'g', category: 'Temperos' },
    { name: 'Cebolinha', unit: 'g', category: 'Temperos' },
    { name: 'Salsinha', unit: 'g', category: 'Temperos' },
    { name: 'Coentro', unit: 'g', category: 'Temperos' },
    { name: 'Manjericão', unit: 'g', category: 'Temperos' },
    { name: 'Orégano', unit: 'g', category: 'Temperos' },
    { name: 'Alecrim', unit: 'g', category: 'Temperos' },
    { name: 'Tomilho', unit: 'g', category: 'Temperos' },
    { name: 'Louro', unit: 'g', category: 'Temperos' },
    { name: 'Cominho', unit: 'g', category: 'Temperos' },
    { name: 'Páprica Doce', unit: 'g', category: 'Temperos' },
    { name: 'Páprica Defumada', unit: 'g', category: 'Temperos' },
    { name: 'Páprica Picante', unit: 'g', category: 'Temperos' },
    { name: 'Colorau', unit: 'g', category: 'Temperos' },
    { name: 'Açafrão', unit: 'g', category: 'Temperos' },
    { name: 'Curry', unit: 'g', category: 'Temperos' },
    { name: 'Noz Moscada', unit: 'g', category: 'Temperos' },
    { name: 'Cravo', unit: 'g', category: 'Temperos' },
    { name: 'Canela em Pó', unit: 'g', category: 'Temperos' },
    { name: 'Canela em Pau', unit: 'g', category: 'Temperos' },
    { name: 'Gengibre', unit: 'g', category: 'Temperos' },
    { name: 'Limão Siciliano', unit: 'kg', category: 'Temperos' },
    { name: 'Limão Taiti', unit: 'kg', category: 'Temperos' },
    { name: 'Lima da Pérsia', unit: 'kg', category: 'Temperos' },

    // ========== ÓLEOS E GORDURAS ==========
    { name: 'Azeite de Oliva Extra Virgem', unit: 'L', category: 'Temperos' },
    { name: 'Azeite de Oliva', unit: 'L', category: 'Temperos' },
    { name: 'Óleo de Cozinha', unit: 'L', category: 'Temperos' },
    { name: 'Óleo de Girassol', unit: 'L', category: 'Temperos' },
    { name: 'Óleo de Canola', unit: 'L', category: 'Temperos' },
    { name: 'Banha de Porco', unit: 'kg', category: 'Temperos' },
    { name: 'Manteiga', unit: 'kg', category: 'Temperos' },
    { name: 'Manteiga com Sal', unit: 'kg', category: 'Temperos' },
    { name: 'Manteiga Ghee', unit: 'kg', category: 'Temperos' },

    // ========== MOLHOS LÍQUIDOS ==========
    { name: 'Molho de Soja (Shoyu)', unit: 'L', category: 'Temperos' },
    { name: 'Molho Inglês', unit: 'L', category: 'Temperos' },
    { name: 'Vinagre de Vinho Tinto', unit: 'L', category: 'Temperos' },
    { name: 'Vinagre de Vinho Branco', unit: 'L', category: 'Temperos' },
    { name: 'Vinagre de Maçã', unit: 'L', category: 'Temperos' },
    { name: 'Vinagre Balsâmico', unit: 'L', category: 'Temperos' },
    { name: 'Sake (Vinho de Arroz)', unit: 'L', category: 'Temperos' },
    { name: 'Vinho Branco', unit: 'L', category: 'Temperos' },
    { name: 'Vinho Tinto', unit: 'L', category: 'Temperos' },
    { name: 'Cerveja', unit: 'L', category: 'Temperos' },

    // ========== LÁCTEOS ==========
    { name: 'Leite Integral', unit: 'L', category: 'Lácteos' },
    { name: 'Leite Condensado', unit: 'kg', category: 'Lácteos' },
    { name: 'Creme de Leite', unit: 'L', category: 'Lácteos' },
    { name: 'Nata', unit: 'L', category: 'Lácteos' },
    { name: 'Iogurte Natural', unit: 'kg', category: 'Lácteos' },
    { name: 'Iogurte Grego', unit: 'kg', category: 'Lácteos' },
    { name: 'Cream Cheese', unit: 'kg', category: 'Lácteos' },

    // ========== BÁSICOS DE COZINHA ==========
    { name: 'Farinha de Trigo', unit: 'kg', category: 'Outros' },
    { name: 'Farinha de Rosca', unit: 'kg', category: 'Outros' },
    { name: 'Fubá', unit: 'kg', category: 'Outros' },
    { name: 'Amido de Milho (Maisena)', unit: 'kg', category: 'Outros' },
    { name: 'Açúcar Refinado', unit: 'kg', category: 'Outros' },
    { name: 'Açúcar Mascavo', unit: 'kg', category: 'Outros' },
    { name: 'Açúcar Demerara', unit: 'kg', category: 'Outros' },
    { name: 'Mel', unit: 'kg', category: 'Outros' },
    { name: 'Ovo', unit: 'unidade', category: 'Outros' },
    { name: 'Água', unit: 'L', category: 'Outros' },

    // ========== BEBIDAS ==========
    { name: 'Refrigerante', unit: 'L', category: 'Bebidas' },
    { name: 'Suco Natural', unit: 'L', category: 'Bebidas' },
    { name: 'Água Mineral', unit: 'L', category: 'Bebidas' },
    { name: 'Água com Gás', unit: 'L', category: 'Bebidas' },
    { name: 'Chá Gelado', unit: 'L', category: 'Bebidas' },

    // ========== CARVÃO E COMBUSTÍVEL ==========
    { name: 'Carvão Vegetal', unit: 'kg', category: 'Outros' },
    { name: 'Carvão de Eucalipto', unit: 'kg', category: 'Outros' },
    { name: 'Lenha', unit: 'kg', category: 'Outros' },
    { name: 'Briquete', unit: 'kg', category: 'Outros' },
    { name: 'Acendedor de Carvão', unit: 'unidade', category: 'Outros' },
    { name: 'Álcool Líquido', unit: 'L', category: 'Outros' },

    // ========== DESCARTÁVEIS ==========
    { name: 'Guardanapo', unit: 'unidade', category: 'Outros' },
    { name: 'Prato Descartável', unit: 'unidade', category: 'Outros' },
    { name: 'Copo Descartável', unit: 'unidade', category: 'Outros' },
    { name: 'Talher Descartável', unit: 'unidade', category: 'Outros' },
    { name: 'Espeto de Bambu', unit: 'unidade', category: 'Outros' },
    { name: 'Espeto de Inox', unit: 'unidade', category: 'Outros' },
    { name: 'Papel Alumínio', unit: 'metro', category: 'Outros' },
    { name: 'Papel Manteiga', unit: 'metro', category: 'Outros' },
    { name: 'Saco de Lixo', unit: 'unidade', category: 'Outros' },
    { name: 'Bandeja de Alumínio', unit: 'unidade', category: 'Outros' }
];

// Função para limpar ingredientes existentes e popular com nova lista completa (MIGRADO PARA INDEXEDDB)
async function clearAndInitializeIngredients() {
    try {
        console.log('🗑️  Limpando ingredientes existentes...');

        // Usar IndexedDB se disponível, senão localStorage
        const storage = window.indexedDBStorage || {
            get: (key, defaultValue) => {
                const data = localStorage.getItem(key);
                return Promise.resolve(data ? JSON.parse(data) : defaultValue);
            },
            set: (key, value) => {
                localStorage.setItem(key, JSON.stringify(value));
                return Promise.resolve();
            }
        };

        const existingData = await storage.get('precificacao_event_data', {});
        const currentData = existingData || {};

        // Limpar ingredientes existentes
        const oldCount = currentData.ingredientsDatabase ? currentData.ingredientsDatabase.length : 0;
        console.log(`📦 Removendo ${oldCount} ingredientes antigos...`);

        // Criar novos ingredientes com IDs sequenciais
        const newIngredients = DEFAULT_INGREDIENTS.map((ing, index) => ({
            id: index + 1,
            name: ing.name,
            unit: ing.unit,
            category: ing.category || 'Outros',
            unitCost: 0,
            lossPercentage: 0
        }));

        // Substituir completamente
        currentData.ingredientsDatabase = newIngredients;

        // Salvar no storage
        await storage.set('precificacao_event_data', currentData);

        console.log(`✅ ${newIngredients.length} ingredientes novos foram adicionados!`);
        console.log('📊 Categorias criadas:');
        console.log(`💾 Storage usado: ${storage === window.indexedDBStorage ? 'IndexedDB' : 'localStorage'}`);

        // Contar por categoria
        const categoryCounts = {};
        newIngredients.forEach(ing => {
            categoryCounts[ing.category] = (categoryCounts[ing.category] || 0) + 1;
        });

        Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
            console.log(`   ${cat}: ${count} itens`);
        });

        return {
            success: true,
            removed: oldCount,
            added: newIngredients.length,
            categories: Object.keys(categoryCounts).length
        };
    } catch (error) {
        console.error('❌ Erro ao limpar e inicializar ingredientes:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Função para adicionar apenas novos ingredientes (mantém os existentes) (MIGRADO PARA INDEXEDDB)
async function initializeDefaultIngredients() {
    try {
        // Usar IndexedDB se disponível, senão localStorage
        const storage = window.indexedDBStorage || {
            get: (key, defaultValue) => {
                const data = localStorage.getItem(key);
                return Promise.resolve(data ? JSON.parse(data) : defaultValue);
            },
            set: (key, value) => {
                localStorage.setItem(key, JSON.stringify(value));
                return Promise.resolve();
            }
        };

        const existingData = await storage.get('precificacao_event_data', {});
        const currentData = existingData || {};

        // Pegar ingredientes existentes
        const existingIngredients = currentData.ingredientsDatabase || [];
        console.log('📦 Ingredientes existentes:', existingIngredients.length);

        // Encontrar o maior ID existente
        const maxId = existingIngredients.length > 0
            ? Math.max(...existingIngredients.map(ing => ing.id || 0))
            : 0;

        console.log('🔢 Maior ID existente:', maxId);

        // Criar lista de nomes normalizados dos ingredientes existentes
        const existingNames = new Set(
            existingIngredients.map(ing =>
                (ing.name || '').toLowerCase().trim()
            )
        );

        // Filtrar ingredientes padrão que ainda não existem
        let addedCount = 0;
        const newIngredients = DEFAULT_INGREDIENTS
            .filter(ing => {
                const normalizedName = ing.name.toLowerCase().trim();
                if (existingNames.has(normalizedName)) {
                    console.log(`⏭️  Pulando "${ing.name}" (já existe)`);
                    return false;
                }
                return true;
            })
            .map((ing, index) => {
                addedCount++;
                return {
                    id: maxId + index + 1,
                    name: ing.name,
                    unit: ing.unit,
                    category: ing.category || 'Outros',
                    unitCost: 0,
                    lossPercentage: 0
                };
            });

        console.log('➕ Novos ingredientes a adicionar:', newIngredients.length);

        // Combinar ingredientes existentes com novos
        currentData.ingredientsDatabase = [...existingIngredients, ...newIngredients];

        // Salvar no storage
        await storage.set('precificacao_event_data', currentData);

        console.log(`🎉 ${addedCount} ingredientes padrão adicionados!`);
        console.log(`📊 Total de ingredientes agora: ${currentData.ingredientsDatabase.length}`);
        console.log(`💾 Storage usado: ${storage === window.indexedDBStorage ? 'IndexedDB' : 'localStorage'}`);

        return {
            success: true,
            added: addedCount,
            total: currentData.ingredientsDatabase.length
        };
    } catch (error) {
        console.error('❌ Erro ao inicializar ingredientes:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Expor para uso global
if (typeof window !== 'undefined') {
    window.DEFAULT_INGREDIENTS = DEFAULT_INGREDIENTS;
    window.initializeDefaultIngredients = initializeDefaultIngredients;
    window.clearAndInitializeIngredients = clearAndInitializeIngredients;
    console.log('✅ DEFAULT_INGREDIENTS exposto no window:', window.DEFAULT_INGREDIENTS.length, 'ingredientes');
    console.log('✅ initializeDefaultIngredients() - adiciona apenas novos ingredientes');
    console.log('✅ clearAndInitializeIngredients() - limpa tudo e adiciona lista completa');
} else {
    console.error('❌ window não está definido!');
}
