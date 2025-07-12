
import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, ThumbsUp, MessageSquare, User, Calendar } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Question {
  id: string;
  title: string;
  description: string;
  created_at: string;
  user_id: string;
  users: {
    username: string;
    avatar_url?: string;
  };
  question_tags: {
    tags: {
      id: number;
      name: string;
    };
  }[];
  answers: {
    id: string;
  }[];
  vote_count?: number;
}

interface Tag {
  id: number;
  name: string;
}

export const Home: React.FC = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [selectedTag, setSelectedTag] = useState(searchParams.get('tag') || '');

  useEffect(() => {
    fetchQuestions();
    fetchTags();
  }, [searchParams]);

  const fetchTags = async () => {
    const { data } = await supabase
      .from('tags')
      .select('*')
      .order('name');
    
    if (data) {
      setTags(data);
    }
  };

  const fetchQuestions = async () => {
    setLoading(true);
    
    let query = supabase
      .from('questions')
      .select(`
        *,
        users:user_id (username, avatar_url),
        question_tags (
          tags (id, name)
        ),
        answers (id)
      `)
      .order('created_at', { ascending: false });

    // Apply search filter
    const search = searchParams.get('search');
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Apply tag filter
    const tag = searchParams.get('tag');
    if (tag) {
      const { data: taggedQuestions } = await supabase
        .from('question_tags')
        .select('question_id')
        .eq('tag_id', parseInt(tag));
      
      if (taggedQuestions) {
        const questionIds = taggedQuestions.map(qt => qt.question_id);
        query = query.in('id', questionIds);
      }
    }

    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching questions:', error);
    } else if (data) {
      setQuestions(data);
    }
    
    setLoading(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (searchTerm) {
      params.set('search', searchTerm);
    } else {
      params.delete('search');
    }
    setSearchParams(params);
  };

  const handleTagFilter = (tagId: string) => {
    const params = new URLSearchParams(searchParams);
    if (tagId && tagId !== 'all') {
      params.set('tag', tagId);
    } else {
      params.delete('tag');
    }
    setSearchParams(params);
    setSelectedTag(tagId);
  };

  if (loading) {
    return <div className="text-center py-8">Loading questions...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <h1 className="text-3xl font-bold">Recent Questions</h1>
        
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1 md:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search questions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit">Search</Button>
          </form>
          
          <Select value={selectedTag} onValueChange={handleTagFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by tag" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tags</SelectItem>
              {tags.map((tag) => (
                <SelectItem key={tag.id} value={tag.id.toString()}>
                  {tag.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-4">
        {questions.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">No questions found.</p>
              <Link to="/ask" className="inline-block mt-4">
                <Button>Ask the first question</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          questions.map((question) => (
            <Card key={question.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <Link 
                      to={`/questions/${question.id}`}
                      className="text-xl font-semibold text-primary hover:underline"
                    >
                      {question.title}
                    </Link>
                    <p className="text-muted-foreground mt-2 line-clamp-2">
                      {question.description.replace(/<[^>]*>/g, '').substring(0, 200)}...
                    </p>
                  </div>
                  
                  <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-4 w-4" />
                      <span>{question.answers.length}</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap gap-2">
                    {question.question_tags.map(({ tags }) => (
                      <Badge 
                        key={tags.id} 
                        variant="secondary"
                        className="cursor-pointer hover:bg-secondary/80"
                        onClick={() => handleTagFilter(tags.id.toString())}
                      >
                        {tags.name}
                      </Badge>
                    ))}
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      <span>{question.users?.username}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(question.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
